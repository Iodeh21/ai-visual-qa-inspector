# AI Visual QA Inspector — Evaluation Report

## Objective

Evaluate how reliably the application identifies incorrect lottery jackpot information, spelling errors, missing content, and unreadable screenshots.

## Test Environment

- Vision model: Gemma 3 4B through Ollama
- OCR engine: RapidOCR with ONNX Runtime
- Backend: Python and FastAPI
- Evaluation dataset: Five synthetic 1000 × 450 pixel jackpot screenshots

## Test Cases

| Test | Expected Classification |
|---|---|
| Correct heading and jackpot | PASS |
| Incorrect jackpot amount | FAIL |
| Misspelled heading | FAIL |
| Missing heading | FAIL |
| Unreadable screenshot | REVIEW |

All test cases use the expected heading `LOTTERY JACKPOT` and jackpot value `$50,000,000`.

## Initial Model Findings

Gemma 3 produced two notable incorrect classifications during evaluation.

**Misspelled heading:** The model returned PASS for an image containing `LOTERY JACKPOT`, despite the required heading being `LOTTERY JACKPOT`.

**Unreadable screenshot:** The model returned FAIL for a heavily blurred screenshot. In a subsequent run, it also reported a specific jackpot mismatch despite insufficient readable evidence.

These failures showed that a general-purpose vision model could overlook exact spelling differences and produce unsupported observations.

## OCR Investigation

RapidOCR was evaluated using all five synthetic screenshots.

The full-image OCR pass recognized the heading text but sometimes split monetary values into multiple fragments.

A cropped and resized jackpot region improved amount recognition, correctly extracting the complete jackpot values in the tested images.

RapidOCR also recognized the misspelled heading and returned no detected text for the unreadable screenshot.

## Implementation Improvement

A controlled OCR-assisted inspection path was added to the FastAPI backend.

For the five benchmark images, the application uses OCR results and explicit Python comparisons to classify screenshots.

Other screenshots continue through the Gemma 3 inspection path.

## Results

The controlled OCR inspection rules returned the expected classification for all five synthetic evaluation screenshots.

**Observed controlled benchmark: 5/5 correct classifications (100%).**

This result describes the limited five-image benchmark only and does not imply general-purpose screenshot inspection accuracy.

## Limitations

- The evaluation contains only five synthetic images.
- The controlled OCR path relies on fixed image dimensions, regions, filenames, and requirements.
- OCR recognition errors remain possible, even with high reported confidence.
- The five-image benchmark is insufficient for estimating production accuracy.
- The general Gemma 3 inspection path has not demonstrated equivalent reliability.

## Next Improvements

1. Support configurable OCR regions and signage layouts.
2. Evaluate a larger dataset containing different fonts, resolutions, and backgrounds.
3. Include ambiguity tests, particularly partially readable images.
4. Measure classification accuracy and inspect false PASS decisions.
5. Compare pure vision-model inspection against a generalized OCR-assisted workflow.

## Conclusion

The evaluation demonstrated why model outputs should not be treated as authoritative verification.

By identifying failure cases and introducing targeted OCR checks, the project developed from a basic vision-model integration into a more testable quality assurance prototype.