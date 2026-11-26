"""Holt neue Messwerte aus der NIDO REST API und schreibt data/data.json neu.

Ablauf
1. data/data.json lesen (bisherige Stundenwerte bleiben erhalten).
2. Messpunkte ab ein paar Stunden vor dem letzten Stundenwert bis jetzt holen.
3. Zu Stundenwerten mitteln und die betroffenen Stunden ersetzen.
4. Ereignisse (EC-Sprünge), Datenlücken, Tagesprofil und Kälteeinbrüche neu berechnen.

Umgebung: NIDO_API_KEY (Secret), NIDO_DEVICE_ID.
Doku: https://doc.nidopro.com  ·  GET https://api.nidopro.com/rest/v1/devices/:deviceId/data
"""
import json, os, sys, time, urllib.parse, urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data", "data.json")
API = "https://api.nidopro.com/rest/v1/devices/{dev}/data"
VIE = ZoneInfo("Europe/Vienna")
H = timedelta(hours=1)
OP = 72              # Betrieb ab 22.10. (nach Befüllung): Stundenindex
OVERLAP_H = 6        # so viele Stunden vor dem letzten Wert neu holen
EC_DROP = 0.08       # mS/cm Abfall zum vorigen Stundenwert = EC-Sprung
COLD_DROP = 3.0      # K unter dem vorigen Stundenmittel = Kälteeinbruch


def iso(dt):
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z")


def parse(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")).astimezone(timezone.utc)


def fetch(dev, key, start, end):
    """Alle Messpunkte im Zeitraum, seitenweise (max. 1000 je Abruf)."""
    out, cur = [], start
    for _ in range(200):
        q = urllib.parse.urlencode({"from": iso(cur), "to": iso(end), "limit": 1000})
        req = urllib.request.Request(API.format(dev=urllib.parse.quote(dev)) + "?" + q,
                                     headers={"x-api-key": key, "Accept": "application/json"})
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    page = json.load(r).get("data", [])
                break
            except urllib.error.HTTPError as e:
                body = e.read().decode("utf-8", "replace")[:300]
                if e.code in (429, 500, 502, 503, 504) and attempt < 2:
                    time.sleep(10 * (attempt + 1)); continue
                sys.exit(f"NIDO API Fehler {e.code}: {body}")
        if not page:
            break
        out += page
        last = max(parse(p["datetime"]) for p in page)
        if len(page) < 1000 or last >= end:
            break
        cur = last + timedelta(milliseconds=1)
    return out


def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def hourly(points, t0, op_start_idx):
    """Messpunkte -> {Stundenindex: [i, ph, ec, wt, at, atn, atx, rh, rhn, rhx]}"""
    seen, buckets = set(), {}
    for p in points:
        dt = p.get("datetime")
        if not dt or dt in seen:
            continue
        seen.add(dt)
        i = int((parse(dt) - t0) / H)
        if i < 0:
            continue
        b = buckets.setdefault(i, {"ph": [], "ec": [], "wt": [], "at": [], "rh": []})
        ph, ec, wt, at, rh = (num(p.get(k)) for k in ("pH", "EC", "waterTemp", "airTemp", "airHum"))
        # Sensor-Nullwerte verwerfen; pH außerhalb 5,0–7,5 nur in der Befüllung
        if ph and not (i < op_start_idx and not 5.0 <= ph <= 7.5):
            b["ph"].append(ph)
        if ec:
            b["ec"].append(ec / 1000.0)  # µS/cm -> mS/cm
        if wt:
            b["wt"].append(wt)
        if at:
            b["at"].append(at)
        if rh:
            b["rh"].append(rh)
    rows = {}
    m = lambda v, d: round(sum(v) / len(v), d) if v else None
    for i, b in buckets.items():
        rows[i] = [i, m(b["ph"], 2), m(b["ec"], 3), m(b["wt"], 1),
                   m(b["at"], 1), round(min(b["at"]), 1) if b["at"] else None, round(max(b["at"]), 1) if b["at"] else None,
                   m(b["rh"], 0), round(min(b["rh"]), 0) if b["rh"] else None, round(max(b["rh"]), 0) if b["rh"] else None]
    return rows


def label(t0, i):
    return (t0 + i * H).astimezone(VIE).strftime("%d.%m. %H:%M")


def derive(D):
    t0 = parse(D["t0"])
    rows = sorted(D["rows"], key=lambda r: r[0])
    by = {r[0]: r for r in rows}
    I1 = rows[-1][0]
    # Datenlücken: Stunden ohne jeden Messpunkt
    gaps, run = [], None
    for i in range(0, I1 + 1):
        if i not in by:
            run = [i, i] if run is None else [run[0], i]
        elif run:
            gaps.append(run); run = None
    D["gaps"] = [{"a": a, "b": b, "t": label(t0, a), "h": b - a + 1} for a, b in gaps]
    # EC-Sprünge: EC fällt um >= EC_DROP gegenüber dem vorigen Stundenwert mit EC.
    # Fällt sie in den Folgestunden weiter, zählt das als ein Ereignis (b = tiefster Wert).
    ec = [r for r in rows if r[2] is not None]
    ev, j = [], 1
    while j < len(ec):
        prev, r = ec[j - 1], ec[j]
        if r[0] >= OP and prev[2] - r[2] >= EC_DROP:
            k = j
            while k + 1 < len(ec) and ec[k + 1][2] < ec[k][2]:
                k += 1
            nxt = [x[1] for x in rows if r[0] <= x[0] <= r[0] + 2 and x[1] is not None]
            ev.append({"i": r[0], "t": label(t0, r[0]), "a": prev[2], "b": min(x[2] for x in ec[j:k + 1]),
                       "pa": prev[1], "pb": max(nxt) if nxt else r[1]})
            j = k + 1
        else:
            j += 1
    D["ev"] = ev
    # Tagesprofil Lufttemperatur (Ortszeit) ab Betrieb: [Mittel, Minimum, Luftfeuchte]
    acc = [[[], [], []] for _ in range(24)]
    for r in rows:
        if r[0] < OP: continue
        h = (t0 + r[0] * H).astimezone(VIE).hour
        if r[4] is not None: acc[h][0].append(r[4])
        if r[5] is not None: acc[h][1].append(r[5])
        if r[7] is not None: acc[h][2].append(r[7])
    D["prof"] = [[round(sum(a) / len(a), 1) if a else None, min(n) if n else None,
                  round(sum(rh) / len(rh)) if rh else None] for a, n, rh in acc]
    # Kälteeinbrüche: Stundenminimum >= COLD_DROP unter dem Mittel der Vorstunde;
    # aufeinanderfolgende Stunden zählen als ein Einbruch
    vents, last = 0, -9
    for r in rows:
        p = by.get(r[0] - 1)
        if r[0] >= OP and r[5] is not None and p and p[4] is not None and p[4] - r[5] >= COLD_DROP:
            if r[0] - last != 1:
                vents += 1
            last = r[0]
    D["vents"] = vents
    return D


def main():
    key, dev = os.environ.get("NIDO_API_KEY"), os.environ.get("NIDO_DEVICE_ID")
    if not key or not dev:
        sys.exit("NIDO_API_KEY und NIDO_DEVICE_ID müssen gesetzt sein.")
    D = json.load(open(DATA, encoding="utf-8"))
    t0 = parse(D["t0"])
    last_i = max(r[0] for r in D["rows"])
    start = max(t0, t0 + (last_i - OVERLAP_H) * H)
    end = datetime.now(timezone.utc).replace(minute=0, second=0, microsecond=0)  # nur volle Stunden
    pts = fetch(dev, key, start, end - timedelta(milliseconds=1))
    new = hourly(pts, t0, OP - 3)
    if not new:
        print("Keine neuen Messpunkte."); return
    rows = {r[0]: r for r in D["rows"]}
    rows.update({i: r for i, r in new.items() if i >= last_i - OVERLAP_H})
    D["rows"] = [rows[i] for i in sorted(rows)]
    derive(D)
    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(D, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(pts)} Messpunkte, {len(new)} Stunden aktualisiert, letzter Wert {label(t0, D['rows'][-1][0])}.")


if __name__ == "__main__":
    main()
