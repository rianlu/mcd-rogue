"""Draw original stage floors and obstacle sprites in the flat top-down style."""

from __future__ import annotations

import json
import shutil
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "maps"
OBS = OUT / "obstacles"
W, H = 960, 540
INK = (45, 45, 45, 255)
STROKE = 6

NAMES = [
    (1, "street", "街角"),
    (2, "kitchen", "后厨"),
    (3, "park", "乐园"),
    (4, "rain", "雨棚"),
    (5, "market", "夜市"),
    (6, "picnic", "野餐"),
    (7, "station", "车站"),
    (8, "roof", "屋顶"),
    (9, "party", "派对"),
    (10, "boss", "头目场"),
    (11, "endless", "无尽"),
]


def new_layer() -> Image.Image:
    return Image.new("RGBA", (W, H), (0, 0, 0, 0))


def clip_round(image: Image.Image) -> Image.Image:
    mask = Image.new("L", (W, H), 0)
    ImageDraw.Draw(mask).rounded_rectangle((2, 2, W - 3, H - 3), radius=28, fill=255)
    result = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    result.paste(image, (0, 0), mask)
    return result


def floor_image(kind: str) -> Image.Image:
    image = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    draw = ImageDraw.Draw(image)
    if kind == "street":
        image.paste((255, 206, 110, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        shift = 0
        for y in range(8, H, 86):
            shift = 48 if shift == 0 else 0
            for x in range(-48, W, 128):
                draw.rounded_rectangle((x + shift, y, x + shift + 116, y + 74), radius=10, fill=(255, 226, 150, 255))
    elif kind == "kitchen":
        image.paste((236, 236, 236, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        for y in range(0, H, 72):
            for x in range(0, W, 72):
                draw.rectangle((x + 4, y + 4, x + 66, y + 66), fill=(250, 250, 250, 255))
    elif kind == "park":
        image.paste((196, 214, 120, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        for i, (x, y) in enumerate(((40, 30), (120, 90), (210, 40), (300, 120), (390, 50), (480, 140), (570, 36), (660, 110), (760, 48), (860, 130), (80, 220), (180, 280), (280, 200), (400, 260), (520, 210), (640, 280), (760, 220), (880, 270), (60, 380), (160, 450), (280, 400), (400, 460), (520, 390), (660, 450), (780, 400), (900, 470))):
            color = (170, 196, 90, 255) if i % 2 == 0 else (214, 196, 80, 255)
            draw.ellipse((x, y, x + 18, y + 12), fill=color)
    elif kind == "rain":
        image.paste((168, 206, 232, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        for y in range(16, H, 28):
            for x in range(0, W, 36):
                draw.line((x, y, x + 14, y + 18), fill=(214, 236, 248, 255), width=3)
    elif kind == "market":
        image.paste((240, 150, 72, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        for y in range(0, H, 40):
            draw.line((0, y, W, y), fill=(214, 110, 48, 255), width=8)
    elif kind == "picnic":
        image.paste((126, 176, 86, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        for x in range(0, W, 28):
            for y in range(0, H, 28):
                if (x + y) % 56 == 0:
                    draw.ellipse((x + 8, y + 10, x + 14, y + 16), fill=(96, 150, 60, 255))
    elif kind == "station":
        image.paste((232, 224, 210, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        for y in range(0, H, 46):
            draw.rectangle((0, y, W, y + 40), fill=(244, 238, 226, 255))
            draw.line((0, y + 40, W, y + 40), fill=(196, 176, 150, 255), width=4)
    elif kind == "roof":
        image.paste((168, 132, 108, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        for y in range(0, H, 120):
            for x in range(0, W, 160):
                draw.rectangle((x + 6, y + 6, x + 150, y + 110), outline=(120, 90, 70, 255), width=4)
    elif kind == "party":
        image.paste((255, 186, 206, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        for y in range(20, H, 48):
            offset = 24 if (y // 48) % 2 else 0
            for x in range(offset, W, 48):
                draw.ellipse((x, y, x + 14, y + 14), fill=(255, 214, 226, 255))
    elif kind == "boss":
        image.paste((255, 196, 96, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        draw.ellipse((180, 40, 780, 500), outline=(230, 140, 40, 255), width=10)
        draw.ellipse((300, 120, 660, 420), outline=(255, 220, 140, 255), width=6)
    else:
        image.paste((255, 150, 72, 255), (0, 0, W, H))
        draw = ImageDraw.Draw(image)
        draw.rectangle((430, 0, 530, H), fill=(255, 186, 110, 255))
        for y in range(20, H, 50):
            draw.rounded_rectangle((468, y, 492, y + 22), radius=4, fill=(255, 244, 220, 255))
    return clip_round(image)


def crop_sprite(layer: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    x, y, w, h = box
    pad = 4
    return layer.crop((max(0, x - pad), max(0, y - pad), min(W, x + w + pad), min(H, y + h + pad)))


def table(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int) -> None:
    draw.rounded_rectangle((x, y, x + w, y + h), radius=22, fill=(214, 156, 78, 255), outline=INK, width=STROKE)
    draw.rounded_rectangle((x + 16, y + 14, x + w - 16, y + h - 14), radius=12, fill=(244, 176, 86, 255), outline=INK, width=4)


def counter(draw: ImageDraw.ImageDraw, x: int, y: int, w: int, h: int, panel: tuple[int, int, int] | None = None) -> None:
    draw.rounded_rectangle((x, y, x + w, y + h), radius=16, fill=(236, 228, 214, 255), outline=INK, width=STROKE)
    if panel:
        draw.rounded_rectangle((x + 14, y + 18, x + w - 14, y + 70), radius=8, fill=(*panel, 255), outline=INK, width=4)
    else:
        draw.rectangle((x + 18, y + 24, x + w - 18, y + 36), fill=INK)


def stool(draw: ImageDraw.ImageDraw, cx: int, cy: int, color: tuple[int, int, int]) -> None:
    r = 28
    draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(*color, 255), outline=INK, width=STROKE)


def umbrella(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    r = 54
    box = (cx - r, cy - r, cx + r, cy + r)
    for i in range(8):
        draw.pieslice(box, start=i * 45 - 90, end=(i + 1) * 45 - 90, fill=((255, 255, 255, 255) if i % 2 else (70, 168, 214, 255)), outline=INK, width=2)
    draw.ellipse(box, outline=INK, width=STROKE)
    draw.ellipse((cx - 10, cy - 10, cx + 10, cy + 10), fill=INK)


def crate(draw: ImageDraw.ImageDraw, x: int, y: int, s: int = 54) -> None:
    draw.rounded_rectangle((x, y, x + s, y + s), radius=10, fill=(214, 168, 102, 255), outline=INK, width=STROKE)
    draw.line((x + 10, y + s / 2, x + s - 10, y + s / 2), fill=INK, width=3)


def stall(draw: ImageDraw.ImageDraw, x: int, y: int, stripes: tuple[int, int, int]) -> None:
    w, h = 210, 96
    draw.rounded_rectangle((x, y + 28, x + w, y + h), radius=12, fill=(255, 244, 220, 255), outline=INK, width=STROKE)
    draw.rounded_rectangle((x, y, x + w, y + 40), radius=10, fill=(*stripes, 255), outline=INK, width=STROKE)
    stripe = ImageDraw.Draw(draw._image) if False else draw
    for i in range(6):
        sx = x + 8 + i * 34
        stripe.rectangle((sx, y + 6, sx + 16, y + 34), fill=(255, 255, 255, 255))


def basket(draw: ImageDraw.ImageDraw, cx: int, cy: int, cloth: tuple[int, int, int]) -> None:
    draw.rounded_rectangle((cx - 46, cy - 28, cx + 46, cy + 28), radius=18, fill=(196, 122, 74, 255), outline=INK, width=STROKE)
    draw.rounded_rectangle((cx - 28, cy - 16, cx + 28, cy + 16), radius=8, fill=(*cloth, 255), outline=INK, width=3)


def bench(draw: ImageDraw.ImageDraw, x: int, y: int, w: int = 220) -> None:
    h = 48
    draw.rounded_rectangle((x, y, x + w, y + h), radius=12, fill=(176, 122, 72, 255), outline=INK, width=STROKE)
    draw.line((x + 16, y + 16, x + w - 16, y + 16), fill=INK, width=3)
    draw.line((x + 16, y + 32, x + w - 16, y + 32), fill=INK, width=3)


def round_table(draw: ImageDraw.ImageDraw, cx: int, cy: int) -> None:
    for i in range(8):
        import math
        ang = math.radians(i * 45)
        sx = cx + int(math.cos(ang) * 62)
        sy = cy + int(math.sin(ang) * 62)
        draw.ellipse((sx - 16, sy - 16, sx + 16, sy + 16), fill=(232, 96, 150, 255), outline=INK, width=4)
    draw.ellipse((cx - 48, cy - 48, cx + 48, cy + 48), fill=(255, 176, 206, 255), outline=INK, width=STROKE)


def crescent(base: Image.Image, cx: int, cy: int, opening_right: bool) -> None:
    draw = ImageDraw.Draw(base)
    box = (cx - 78, cy - 86, cx + 78, cy + 86)
    inner = (cx - 68, cy - 76, cx + 68, cy + 76)
    start, end = (100, 260) if opening_right else (-80, 80)
    draw.arc(box, start=start, end=end, fill=INK, width=52)
    draw.arc(inner, start=start, end=end, fill=(214, 156, 86, 255), width=34)


def main() -> None:
    if OBS.exists():
        shutil.rmtree(OBS)
    OBS.mkdir(parents=True)
    for old in OUT.glob("bg-*.png"):
        old.unlink()
    for old in OUT.glob("full-*.png"):
        old.unlink()

    specs: list[dict] = []

    def commit(stage: int, key: str, title: str, layer: Image.Image, boxes: list[tuple[int, int, int, int]]) -> None:
        bg = floor_image(key)
        bg_name = f"maps/bg-{stage:02d}-{key}.png"
        bg.save(ROOT / "public" / bg_name)
        obstacles = []
        for index, box in enumerate(boxes, start=1):
            sprite = crop_sprite(layer, box)
            file_name = f"maps/obstacles/{stage:02d}-{key}-{index}.png"
            sprite.save(ROOT / "public" / file_name)
            x, y, w, h = box
            obstacles.append({"file": file_name, "x": x, "y": y, "w": w, "h": h})
        preview = bg.copy()
        preview.alpha_composite(layer)
        preview.save(OUT / f"full-{stage:02d}-{key}.png")
        specs.append({"stage": stage, "key": key, "name": title, "width": W, "height": H, "background": bg_name, "obstacles": obstacles})

    # 1 street
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    for box in ((70, 46, 280, 96), (610, 46, 280, 96), (70, 398, 280, 96), (610, 398, 280, 96)):
        table(draw, *box)
        boxes.append(box)
    commit(1, "street", "街角", layer, boxes)

    # 2 kitchen
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    for box, panel in (
        ((46, 70, 86, 400), (90, 150, 190)),
        ((190, 90, 78, 360), None),
        ((690, 80, 86, 390), (220, 120, 60)),
        ((840, 150, 72, 250), None),
    ):
        counter(draw, *box, panel)
        boxes.append(box)
    commit(2, "kitchen", "后厨", layer, boxes)

    # 3 park
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    colors = [(214, 64, 64), (64, 140, 214), (64, 180, 96), (240, 196, 48), (230, 120, 48), (80, 110, 210)]
    spots = ((180, 120), (420, 90), (720, 140), (250, 300), (520, 250), (760, 340))
    for (cx, cy), color in zip(spots, colors):
        stool(draw, cx, cy, color)
        boxes.append((cx - 28, cy - 28, 56, 56))
    commit(3, "park", "乐园", layer, boxes)

    # 4 rain
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    umbrella(draw, 250, 150)
    umbrella(draw, 700, 360)
    boxes.extend(((196, 96, 108, 108), (646, 306, 108, 108)))
    for x, y in ((46, 80), (46, 160), (46, 250), (860, 250), (860, 340), (860, 430)):
        crate(draw, x, y)
        boxes.append((x, y, 54, 54))
    commit(4, "rain", "雨棚", layer, boxes)

    # 5 market
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    stalls = (
        ((70, 36), (196, 64, 72)),
        ((560, 36), (64, 130, 196)),
        ((70, 400), (64, 160, 96)),
        ((560, 400), (150, 90, 180)),
    )
    for (x, y), color in stalls:
        stall(draw, x, y, color)
        boxes.append((x, y, 210, 96))
    commit(5, "market", "夜市", layer, boxes)

    # 6 picnic
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    cloths = ((196, 64, 64), (64, 120, 196), (230, 190, 60), (64, 160, 90), (180, 80, 160))
    for (cx, cy), cloth in zip(((220, 120), (700, 110), (470, 250), (200, 400), (720, 390)), cloths):
        basket(draw, cx, cy, cloth)
        boxes.append((cx - 46, cy - 28, 92, 56))
    commit(6, "picnic", "野餐", layer, boxes)

    # 7 station
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    for box in ((120, 70, 250, 48), (500, 230, 250, 48), (180, 420, 250, 48)):
        bench(draw, box[0], box[1], box[2])
        boxes.append(box)
    commit(7, "station", "车站", layer, boxes)

    # 8 roof
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    clusters = [(60, 50), (150, 50), (760, 50), (850, 50), (60, 420), (150, 420), (760, 420)]
    for x, y in clusters:
        crate(draw, x, y, 64)
        boxes.append((x, y, 64, 64))
    commit(8, "roof", "屋顶", layer, boxes)

    # 9 party
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    for cx, cy in ((250, 150), (680, 170), (460, 390)):
        round_table(draw, cx, cy)
        boxes.append((cx - 80, cy - 80, 160, 160))
    commit(9, "party", "派对", layer, boxes)

    # 10 boss
    layer, boxes = new_layer(), []
    draw = ImageDraw.Draw(layer)
    for box in ((36, 36, 90, 48), (834, 36, 90, 48), (36, 456, 90, 48), (834, 456, 90, 48)):
        draw.rounded_rectangle((box[0], box[1], box[0] + box[2], box[1] + box[3]), radius=16, fill=(90, 96, 110, 255), outline=INK, width=STROKE)
        boxes.append(box)
    commit(10, "boss", "头目场", layer, boxes)

    # 11 endless
    layer = new_layer()
    spots = ((180, 150, True), (180, 390, True), (780, 150, False), (780, 390, False))
    boxes = []
    for cx, cy, opening_right in spots:
        crescent(layer, cx, cy, opening_right)
        if opening_right:
            boxes.append((cx - 78, cy - 86, 78, 172))
        else:
            boxes.append((cx, cy - 86, 78, 172))
    commit(11, "endless", "无尽", layer, boxes)

    payload = {"note": "坐标是 960×540 房间里的像素，左上角为原点", "maps": specs}
    (OUT / "layout.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "src" / "game" / "map-layout.json").write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print("maps", len(specs))


if __name__ == "__main__":
    main()
