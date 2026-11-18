from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUTPUT = Path(__file__).parent / "evaluation_images"
OUTPUT.mkdir(exist_ok=True)

WIDTH, HEIGHT = 1000, 450


def get_font(size):
    try:
        return ImageFont.truetype("arial.ttf", size)
    except OSError:
        return ImageFont.load_default()


def make_screenshot(filename, heading, amount, blur=False):
    img = Image.new("RGB", (WIDTH, HEIGHT), "#111827")
    draw = ImageDraw.Draw(img)

    heading_font = get_font(42)
    amount_font = get_font(90)

    if heading:
        box = draw.textbbox((0, 0), heading, font=heading_font)
        text_width = box[2] - box[0]
        draw.text(
            ((WIDTH - text_width) / 2, 90),
            heading,
            font=heading_font,
            fill="white"
        )

    if amount:
        box = draw.textbbox((0, 0), amount, font=amount_font)
        text_width = box[2] - box[0]
        draw.text(
            ((WIDTH - text_width) / 2, 200),
            amount,
            font=amount_font,
            fill="#FACC15"
        )

    if blur:
        img = img.filter(ImageFilter.GaussianBlur(radius=25))

    img.save(OUTPUT / filename)


make_screenshot(
    "01_correct.png",
    "LOTTERY JACKPOT",
    "$50,000,000"
)

make_screenshot(
    "02_wrong_amount.png",
    "LOTTERY JACKPOT",
    "$5,000,000"
)

make_screenshot(
    "03_typo.png",
    "LOTERY JACKPOT",
    "$50,000,000"
)

make_screenshot(
    "04_missing_heading.png",
    "",
    "$50,000,000"
)

make_screenshot(
    "05_unreadable.png",
    "LOTTERY JACKPOT",
    "$50,000,000",
    blur=True
)

print("Created 5 evaluation screenshots in:")
print(OUTPUT)