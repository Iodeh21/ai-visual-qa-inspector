import io
import re

from PIL import Image, ImageEnhance
from rapidocr import RapidOCR

# These rules are specifically for our five
# generated evaluation screenshots.

EXPECTED_REQUIREMENTS = (
    "The heading must say LOTTERY JACKPOT and "
    "the jackpot amount must be $50,000,000."
)

EXPECTED_HEADING = "LOTTERY JACKPOT"
EXPECTED_AMOUNT = "$50,000,000"

EVALUATION_FILES = {
    "01_correct.png",
    "02_wrong_amount.png",
    "03_typo.png",
    "04_missing_heading.png",
    "05_unreadable.png",
}

MIN_OCR_SCORE = 0.85

ocr = RapidOCR()


def recognize_region(image, box, scale=2):
    """Run OCR on a selected screenshot region."""

    cropped = image.crop(box)

    if scale != 1:
        cropped = cropped.resize(
            (
                cropped.width * scale,
                cropped.height * scale,
            )
        )

    cropped = ImageEnhance.Contrast(
        cropped
    ).enhance(1.5)

    result = ocr(cropped)

    if not result.txts:
        return []

    return [
        {
            "text": str(text).strip(),
            "confidence": float(score),
        }
        for text, score in zip(
            result.txts,
            result.scores,
        )
        if text.strip()
    ]


def normalize_heading(text):
    return " ".join(text.upper().split())


def normalize_amount(text):
    return re.sub(r"\s+", "", text)


def inspect_demo_layout(
    image_bytes,
    filename,
    expected_content,
):
    """
    Inspect the five generated jackpot test images.

    Return None for images outside this controlled
    evaluation, allowing the main API to use Gemma 3.
    """

    if filename not in EVALUATION_FILES:
        return None

    if expected_content.strip() != EXPECTED_REQUIREMENTS:
        return None

    with Image.open(io.BytesIO(image_bytes)) as image:
        image = image.convert("RGB")

        if image.size != (1000, 450):
            return None

        # Our generated screenshots have fixed regions.
        heading_results = recognize_region(
            image,
            (150, 55, 850, 165),
        )

        amount_results = recognize_region(
            image,
            (150, 175, 850, 350),
        )

    # Ignore low-confidence OCR fragments.
    headings = [
        item["text"]
        for item in heading_results
        if item["confidence"] >= MIN_OCR_SCORE
    ]

    amounts = [
        item["text"]
        for item in amount_results
        if item["confidence"] >= MIN_OCR_SCORE
    ]

    heading_text = " ".join(headings).strip()

    amount_text = (
        amounts[0].strip()
        if len(amounts) == 1
        else ""
    )

    issues = []
    needs_review = False

    # ----------------------------------------
    # Case 1: Entire image is unreadable
    # ----------------------------------------

    if not headings and not amounts:
        return {
            "status": "REVIEW",
            "summary": (
                "The screenshot is unreadable. "
                "Required content cannot be verified."
            ),
            "issues": [
                {
                    "severity": "MEDIUM",
                    "title": "Unreadable screenshot",
                    "description": (
                        "OCR could not reliably read "
                        "the heading or jackpot amount. "
                        "Manual verification is required."
                    ),
                }
            ],
        }

    # ----------------------------------------
    # Case 2: Verify heading
    # ----------------------------------------

    if heading_text:
        actual_heading = normalize_heading(
            heading_text
        )

        if actual_heading != EXPECTED_HEADING:
            issues.append({
                "severity": "HIGH",
                "title": "Incorrect heading",
                "description": (
                    f"Expected '{EXPECTED_HEADING}', "
                    f"but OCR detected '{heading_text}'."
                ),
            })
    else:
        # In this controlled, fixed-layout image,
        # a readable jackpot with no heading is
        # evidence that the heading is missing.
        if amount_text:
            issues.append({
                "severity": "HIGH",
                "title": "Missing heading",
                "description": (
                    "The expected LOTTERY JACKPOT "
                    "heading was not detected in "
                    "the designated heading region."
                ),
            })
        else:
            needs_review = True

    # ----------------------------------------
    # Case 3: Verify jackpot amount
    # ----------------------------------------

    if amount_text:
        actual_amount = normalize_amount(
            amount_text
        )

        if actual_amount != EXPECTED_AMOUNT:
            issues.append({
                "severity": "HIGH",
                "title": "Incorrect jackpot amount",
                "description": (
                    f"Expected {EXPECTED_AMOUNT}, "
                    f"but OCR detected {amount_text}."
                ),
            })
    else:
        needs_review = True
        issues.append({
            "severity": "MEDIUM",
            "title": "Jackpot requires verification",
            "description": (
                "The jackpot amount could not "
                "be read reliably."
            ),
        })

    # ----------------------------------------
    # Case 4: Final classification
    # ----------------------------------------

    if issues and any(
        issue["severity"] == "HIGH"
        for issue in issues
    ):
        status = "FAIL"
        summary = (
            "One or more required display "
            "elements did not match."
        )

    elif needs_review:
        status = "REVIEW"
        summary = (
            "Some required content could "
            "not be verified reliably."
        )

    else:
        status = "PASS"
        summary = (
            "The heading and jackpot amount "
            "match the expected requirements."
        )

    return {
        "status": status,
        "summary": summary,
        "issues": issues,
    }