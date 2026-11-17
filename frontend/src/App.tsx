import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import "./App.css";

type Status = "PASS" | "FAIL" | "REVIEW";
type Severity = "HIGH" | "MEDIUM" | "LOW";

interface Issue {
  severity: Severity;
  title: string;
  description: string;
}

interface InspectionResult {
  status: Status;
  summary: string;
  issues: Issue[];
}

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [expected, setExpected] = useState("");
  const [result, setResult] =
    useState<InspectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    setResult(null);
    setError("");

    if (!selected) {
      setFile(null);
      return;
    }

    const accepted = ["image/png", "image/jpeg", "image/webp"];

    if (!accepted.includes(selected.type)) {
      setFile(null);
      setError("Please select a PNG, JPEG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setFile(null);
      setError("Image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setFile(selected);
  }

  async function inspect(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || !expected.trim() || loading) return;

    setLoading(true);
    setError("");
    setResult(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append("expected_content", expected.trim());

    try {
      const response = await fetch(`${API_URL}/api/inspect`, {
        method: "POST",
        body: formData,
      });

      const data: unknown = await response.json();

      if (!response.ok) {
        let message = `Request failed (${response.status})`;

        if (
          typeof data === "object" &&
          data !== null &&
          "detail" in data &&
          typeof data.detail === "string"
        ) {
          message = data.detail;
        }

        throw new Error(message);
      }

      if (
        typeof data !== "object" ||
        data === null ||
        !("status" in data) ||
        !("summary" in data) ||
        !("issues" in data) ||
        !["PASS", "FAIL", "REVIEW"].includes(
          String(data.status)
        ) ||
        typeof data.summary !== "string" ||
        !Array.isArray(data.issues)
      ) {
        throw new Error("Invalid response from the backend.");
      }

      setResult(data as InspectionResult);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to connect to the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setExpected("");
    setResult(null);
    setError("");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">V</div>
          <div>
            <strong>VisualQA</strong>
            <span>AI Inspection Platform</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item active">◈ &nbsp; Inspector</div>

        <div className="sidebar-footer">
          <span className="online-dot" />
          Local AI · Gemma 3
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace / <span>Inspector</span>
            </div>
            <h1>Visual Inspection</h1>
            <p>
              Detect content inconsistencies and visual defects
              with local AI.
            </p>
          </div>
          <div className="local-badge">
            <span className="online-dot" />
            Local Mode
          </div>
        </header>

        <div className="workspace">
          <form className="panel input-panel" onSubmit={inspect}>
            <div className="panel-heading">
              <div>
                <h2>New Inspection</h2>
                <p>Configure a screenshot quality check.</p>
              </div>
              <span className="step-pill">01 / 02</span>
            </div>

            <label className="field-label" htmlFor="image">
              Display Screenshot
            </label>

            <label className="upload-zone" htmlFor="image">
              {preview ? (
                <img
                  src={preview}
                  alt="Screenshot preview"
                  className="preview-image"
                />
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">↑</div>
                  <strong>Click to upload a screenshot</strong>
                  <span>PNG, JPEG or WebP · Maximum 5 MB</span>
                </div>
              )}
            </label>

            <input
              id="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFile}
              className="hidden-input"
            />

            {file && (
              <div className="file-details">
                <span>{file.name}</span>
                <span>{(file.size / 1024).toFixed(0)} KB</span>
              </div>
            )}

            <label
              className="field-label expected-label"
              htmlFor="expected"
            >
              Expected Content
            </label>
            <textarea
              id="expected"
              value={expected}
              onChange={(event) => {
                setExpected(event.target.value);
                setResult(null);
              }}
              placeholder={
                "Example: The jackpot must display $50,000,000. " +
                "The heading must say LOTTERY JACKPOT."
              }
              maxLength={2000}
              rows={5}
            />

            <div className="form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={reset}
                disabled={loading}
              >
                Reset
              </button>
              <button
                className="primary-button"
                type="submit"
                disabled={
                  !file || !expected.trim() || loading
                }
              >
                {loading
                  ? "Analyzing screenshot..."
                  : "✦ Run AI Inspection"}
              </button>
            </div>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}
          </form>

          <section className="panel results-panel">
            <div className="panel-heading">
              <div>
                <h2>Inspection Results</h2>
                <p>AI-generated quality assurance findings.</p>
              </div>
              <span className="step-pill">02 / 02</span>
            </div>

            {!result && !loading && (
              <div className="empty-state">
                <div className="empty-icon">◎</div>
                <h3>No inspection yet</h3>
                <p>
                  Upload a screenshot and run an inspection
                  to see detected issues here.
                </p>
              </div>
            )}

            {loading && (
              <div className="empty-state" role="status">
                <div className="spinner" />
                <h3>Analyzing screenshot</h3>
                <p>
                  Gemma 3 is examining the display.
                  Local inference may take a while.
                </p>
              </div>
            )}

            {result && (
              <div className="result-content">
                <div className={`result-banner ${result.status.toLowerCase()}`}>
                  <div>
                    <span>INSPECTION STATUS</span>
                    <h3>{result.status}</h3>
                  </div>
                  <div className="result-symbol">
                    {result.status === "PASS"
                      ? "✓"
                      : result.status === "FAIL"
                        ? "!"
                        : "?"}
                  </div>
                </div>

                <div className="summary-box">
                  <h3>Analysis Summary</h3>
                  <p>{result.summary}</p>
                </div>

                <div className="issues-heading">
                  <h3>Detected Issues</h3>
                  <span>{result.issues.length}</span>
                </div>

                {result.issues.length === 0 ? (
                  <div className="no-issues">
                    No issues reported by the model.
                  </div>
                ) : (
                  <div className="issue-list">
                    {result.issues.map((issue, index) => (
                      <article className="issue-card" key={index}>
                        <div className="issue-top">
                          <strong>{issue.title}</strong>
                          <span
                            className={`severity ${issue.severity.toLowerCase()}`}
                          >
                            {issue.severity}
                          </span>
                        </div>
                        <p>{issue.description}</p>
                      </article>
                    ))}
                  </div>
                )}

                <p className="ai-disclaimer">
                  AI findings are advisory. Verify issues
                  before reporting or releasing content.
                </p>
              </div>
            )}
          </section>
        </div>

        <footer>
          VisualQA Inspector · Built with React, FastAPI,
          Ollama and Gemma 3
        </footer>
      </main>
    </div>
  );
}

export default App;
