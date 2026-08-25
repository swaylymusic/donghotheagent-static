from pathlib import Path
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "uploads" / "2026" / "08"
OUTPUT.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1600, 900
NAVY = "#17324D"
GOLD = "#B69354"
BLUE = "#4E7896"
PALE = "#E9EFF3"
TEXT = "#17283A"
MUTED = "#607488"
WHITE = "#FFFFFF"
BACKGROUND = "#F7F9FA"

FONT_REGULAR = "C:/Windows/Fonts/malgun.ttf"
FONT_BOLD = "C:/Windows/Fonts/malgunbd.ttf"


def font(size, bold=False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REGULAR, size)


def base_canvas(title, subtitle):
    image = Image.new("RGB", (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(image)
    draw.text((100, 72), title, font=font(54, True), fill=NAVY)
    draw.text((100, 148), subtitle, font=font(29), fill=MUTED)
    draw.line((100, 205, 1500, 205), fill="#D8E0E6", width=3)
    return image, draw


def footer(draw):
    draw.text((100, 838), "출처: TRREB Market Watch - July 2026", font=font(21), fill=MUTED)
    draw.text((1500, 838), "donghotheagent.com", font=font(21, True), fill=GOLD, anchor="ra")


def draw_yoy_change():
    image, draw = base_canvas(
        "2026년 7월 GTA 시장: 전년 대비 변화",
        "거래량은 보합 수준이지만 신규 매물과 전체 재고는 두 자릿수 감소",
    )
    data = [
        ("거래량", -0.9),
        ("신규 매물", -17.8),
        ("Active Listings", -10.1),
        ("평균 매매가격", -4.5),
    ]
    label_x, zero_x = 110, 520
    max_width = 820
    max_abs = 20
    start_y, row_gap, bar_h = 275, 130, 58
    draw.line((zero_x, 245, zero_x, 760), fill="#AAB9C4", width=3)
    for idx, (label, value) in enumerate(data):
        y = start_y + idx * row_gap
        draw.text((label_x, y + bar_h / 2), label, font=font(30, True), fill=TEXT, anchor="lm")
        draw.rounded_rectangle((zero_x, y, zero_x + max_width, y + bar_h), radius=18, fill=PALE)
        width = max(20, int(abs(value) / max_abs * max_width))
        color = GOLD if label == "거래량" else NAVY
        draw.rounded_rectangle((zero_x, y, zero_x + width, y + bar_h), radius=18, fill=color)
        draw.text((zero_x + width + 24, y + bar_h / 2), f"{value:.1f}%", font=font(31, True), fill=TEXT, anchor="lm")
    footer(draw)
    image.save(OUTPUT / "gta-july-2026-yoy-change.png", quality=95)


def draw_home_type_prices():
    image, draw = base_canvas(
        "2026년 7월 GTA 주택 유형별 평균 가격",
        "평균 가격과 월간 거래량을 함께 비교",
    )
    data = [
        ("Detached", 1_291_690, 2_789),
        ("Semi-Detached", 964_922, 557),
        ("Townhouse", 817_213, 1_003),
        ("Condo Apartment", 636_323, 1_564),
    ]
    label_x, bar_x = 110, 460
    max_width = 820
    max_price = 1_400_000
    start_y, row_gap, bar_h = 265, 138, 62
    for idx, (label, price, sales) in enumerate(data):
        y = start_y + idx * row_gap
        draw.text((label_x, y + 7), label, font=font(29, True), fill=TEXT)
        draw.text((label_x, y + 48), f"거래 {sales:,}건", font=font(22), fill=MUTED)
        draw.rounded_rectangle((bar_x, y, bar_x + max_width, y + bar_h), radius=18, fill=PALE)
        width = int(price / max_price * max_width)
        color = NAVY if idx < 2 else BLUE
        draw.rounded_rectangle((bar_x, y, bar_x + width, y + bar_h), radius=18, fill=color)
        draw.text((bar_x + width + 24, y + bar_h / 2), f"${price:,.0f}", font=font(29, True), fill=TEXT, anchor="lm")
    footer(draw)
    image.save(OUTPUT / "gta-july-2026-home-type-prices.png", quality=95)


if __name__ == "__main__":
    draw_yoy_change()
    draw_home_type_prices()
