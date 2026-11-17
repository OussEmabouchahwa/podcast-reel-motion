import cv2, numpy as np, sys
# usage: python3 clean.py in.mp4 out.mp4 X0 X1 Y0 Y1   (box around the burned-in captions, source pixels)
src, dst = sys.argv[1], sys.argv[2]; X0, X1, Y0, Y1 = map(int, sys.argv[3:7])
cap = cv2.VideoCapture(src); fps = cap.get(5); w = int(cap.get(3)); h = int(cap.get(4))
out = cv2.VideoWriter(dst, cv2.VideoWriter_fourcc(*'mp4v'), fps, (w, h))
k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
while True:
    ok, f = cap.read()
    if not ok: break
    hsv = cv2.cvtColor(f[Y0:Y1, X0:X1], cv2.COLOR_BGR2HSV)
    m = ((hsv[..., 2] > 200) & (hsv[..., 1] < 60)).astype(np.uint8) * 255   # white text
    n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8); keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i][4] < 4000: keep[lab == i] = 255                           # glyph-sized blobs only (not white clothes)
    full = np.zeros((h, w), np.uint8); full[Y0:Y1, X0:X1] = cv2.dilate(keep, k, iterations=2)
    out.write(cv2.inpaint(f, full, 6, cv2.INPAINT_TELEA))
