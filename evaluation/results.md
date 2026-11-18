
# AI Visual QA Inspector — Model Evaluation

## Model
Gemma 3 4B, running locally through Ollama.

## Initial Findings

### Test: Misspelled heading
- Expected: FAIL
- Actual: PASS
- Result: Incorrect
- Observation: Model accepted "LOTERY JACKPOT"
  despite the expected "LOTTERY JACKPOT".

### Test: Unreadable screenshot
- Expected: REVIEW
- Actual: FAIL
- Result: Incorrect
- Observation: Model recognized the screenshot
  was unreadable but classified it as a defect.

## Proposed Improvement
Revise the inspection prompt to emphasize exact
text verification and distinguish confirmed
defects from uncertain observations.

## Next Steps
Rerun the evaluation and compare results against
the original predictions.

Initial tests revealed that Gemma 3 missed a heading typo and misclassified an unreadable screenshot. I introduced RapidOCR and deterministic text comparisons for a controlled lottery-display layout. This reduced dependence on vision-model guesses for exact text verification. The approach is currently limited to a fixed evaluation layout; generalizing it to arbitrary signage remains future work.