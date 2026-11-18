from pathlib import Path

from inspection_rules import (
    EXPECTED_REQUIREMENTS,
    inspect_demo_layout,
)

FOLDER = (
    Path(__file__).parent / "evaluation_images"
)

TESTS = [
    ("01_correct.png", "PASS"),
    ("02_wrong_amount.png", "FAIL"),
    ("03_typo.png", "FAIL"),
    ("04_missing_heading.png", "FAIL"),
    ("05_unreadable.png", "REVIEW"),
]

passed = 0

for filename, expected in TESTS:
    image_bytes = (FOLDER / filename).read_bytes()

    result = inspect_demo_layout(
        image_bytes,
        filename,
        EXPECTED_REQUIREMENTS,
    )

    actual = result["status"] if result else "NO RESULT"

    success = actual == expected

    if success:
        passed += 1

    print(f"\n{filename}")
    print(f"Expected: {expected}")
    print(f"Actual:   {actual}")
    print(f"Result:   {'PASS' if success else 'FAIL'}")

    if result:
        print(f"Summary:  {result['summary']}")

print("\n" + "=" * 40)
print(f"Tests passed: {passed}/{len(TESTS)}")

if passed != len(TESTS):
    raise SystemExit(1)