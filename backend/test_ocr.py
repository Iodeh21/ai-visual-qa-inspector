from pathlib import Path

from PIL import Image, ImageEnhance
from rapidocr import RapidOCR

ocr = RapidOCR()

folder = Path(__file__).parent / "evaluation_images"

images = [
    "01_correct.png",
    "02_wrong_amount.png",
    "03_typo.png",
    "04_missing_heading.png",
    "05_unreadable.png",
]


def show_results(result):
    if not result.txts:
        print("No text detected — REVIEW")
        return

    for text, score in zip(result.txts, result.scores):
        print(f"Text: {text!r} | Confidence: {score:.2f}")


for filename in images:
    print(f"\n{'=' * 55}")
    print(f"IMAGE: {filename}")

    path = folder / filename

    print("\nFULL IMAGE:")
    full_result = ocr(str(path))
    show_results(full_result)

    # This crop is specific to our generated test images.
    # We'll need a more general approach for arbitrary screenshots.
    with Image.open(path) as original:
        cropped = original.crop((150, 175, 850, 350))
        cropped = cropped.resize((1400, 350))

        cropped = ImageEnhance.Contrast(cropped).enhance(1.5)

        print("\nJACKPOT REGION:")
        crop_result = ocr(cropped)
        show_results(crop_result)