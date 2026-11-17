"""Prove that picture and voice are in sync.

usage: python3 scripts/sync_check.py reel.mp4 source.mp4 OFFSET "rx,ry,rw,rh" "sx,sy,sw,sh" START DUR [START DUR ...]
  OFFSET       reel seconds where source second 0 plays (CFG.OFFSET)
  rx,ry,rw,rh  footage area inside the reel (card or full-bleed), reel pixels
  sx,sy,sw,sh  the same picture area in the source, source pixels
  START DUR    reel windows (seconds) that lie inside ONE footage scene; use 2-5 s windows

Method: the motion signal (mean absolute difference between consecutive frames) of the reel crop
and of the source crop are resampled to 30 fps and cross-correlated over lags -6..+6 frames.
Motion survives the scene's zoom, colour grade and grain, so the peak lag is the real offset.
"lag 0" in every window means picture and audio are in sync (the voice is the source audio at OFFSET).
"""
import sys, subprocess, numpy as np

reel, src, off = sys.argv[1], sys.argv[2], float(sys.argv[3])
rc = [int(v) for v in sys.argv[4].split(",")]; sc = [int(v) for v in sys.argv[5].split(",")]
wins = [(float(sys.argv[i]), float(sys.argv[i + 1])) for i in range(6, len(sys.argv), 2)]
PAD = 0.4

def motion(f, ss, dur, c):
    x, y, w, h = c
    d = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{ss:.3f}", "-t", f"{dur:.3f}", "-i", f, "-vf",
                        f"crop={w}:{h}:{x}:{y},fps=30,scale=64:64,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    a = np.frombuffer(d, np.uint8).reshape(-1, 64, 64).astype(float)
    m = np.abs(np.diff(a, axis=0)).mean((1, 2)); return (m - m.mean()) / (m.std() + 1e-9)

ok = True
for st, dur in wins:
    r = motion(reel, st, dur, rc)
    s = motion(src, st - off - PAD, dur + 2 * PAD, sc)        # source window with margin on both sides
    p = int(round(PAD * 30)); best = None
    for lag in range(-6, 7):
        a = s[p + lag: p + lag + len(r)]
        if len(a) < len(r): continue
        c = float(np.corrcoef(r, a)[0, 1])
        if best is None or c > best[1]: best = (lag, c)
    ok &= best[0] == 0
    print(f"reel {st:6.2f}-{st + dur:6.2f}s   lag {best[0]:+d} frames   r={best[1]:.2f}   {'OK' if best[0] == 0 else 'OUT OF SYNC'}")
print("SYNC OK" if ok else "SYNC PROBLEM")
