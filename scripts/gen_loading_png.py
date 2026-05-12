"""Generate loading.png overlay for the project editor load screen.

Layout matches editions/free/src/css/editormodal.css:
  - Canvas 420x113 (matches .loadicon)
  - Progress bar zone: left=20, top=27, width=378, height=66
The overlay draws a rounded frame around that zone and a "Loading..." label
above it. The interior is left transparent so the orange progress fill and
white cover beneath remain visible.
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

W, H = 420, 113
BAR_LEFT, BAR_TOP, BAR_W, BAR_H = 20, 27, 378, 66
BAR_RIGHT = BAR_LEFT + BAR_W
BAR_BOTTOM = BAR_TOP + BAR_H

FRAME_COLOR = (60, 60, 60, 230)
TEXT_COLOR = (60, 60, 60, 255)
FRAME_WIDTH = 2
RADIUS = 10

img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

draw.rounded_rectangle(
    [BAR_LEFT - 1, BAR_TOP - 1, BAR_RIGHT, BAR_BOTTOM],
    radius=RADIUS,
    outline=FRAME_COLOR,
    width=FRAME_WIDTH,
)

label = "Loading..."
font = None
for candidate in [
    "C:/Windows/Fonts/segoeuib.ttf",
    "C:/Windows/Fonts/seguisb.ttf",
    "C:/Windows/Fonts/arial.ttf",
]:
    if Path(candidate).exists():
        try:
            font = ImageFont.truetype(candidate, 18)
            break
        except Exception:
            continue
if font is None:
    font = ImageFont.load_default()

bbox = draw.textbbox((0, 0), label, font=font)
tw = bbox[2] - bbox[0]
th = bbox[3] - bbox[1]
tx = (W - tw) // 2 - bbox[0]
ty = (BAR_TOP - th) // 2 - bbox[1]
draw.text((tx, ty), label, fill=TEXT_COLOR, font=font)

out = Path(__file__).resolve().parent.parent / "editions/free/src/assets/loading.png"
img.save(out, "PNG")
print(f"Wrote {out} ({W}x{H} RGBA)")
