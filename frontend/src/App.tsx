
import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import "./App.css";

// ============================================
// Types
// ============================================

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

interface SavedInspection extends InspectionResult {
  id: number;
  filename: string;
  expected_content: string;
  created_at: string;
}

const API_URL = "http://127.0.0.1:8000";

// ============================================
// Component
// ============================================

function App() {
  // Screenshot upload
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [expected, setExpected] = useState("");

  // AI inspection
  const [result, setResult] =
    useState<InspectionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // SQLite inspection history
  const [history, setHistory] = useState<SavedInspection[]>([]);
  const [historyError, setHistoryError] = useState("");
  const [selectedInspectionId, setSelectedInspectionId] =
    useState<number | null>(null);

  // ============================================
  // React Effects
  // ============================================

  // Generate and clean up image preview URLs.
  useEffect(() => {
    if (!file) {
      return;
    }

    const url = URL.createObjectURL(file);
    setPreview(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Load saved inspections when the component mounts.
  useEffect(() => {
    void loadHistory();
  }, []);

  // ============================================
  // Inspection History
  // ============================================

  async function loadHistory() {
    try {
      const response = await fetch(
        `${API_URL}/api/inspections`
      );

      if (!response.ok) {
        throw new Error("Failed to load inspection history.");
      }

      const data: { inspections: SavedInspection[] } =
        await response.json();

      if (!Array.isArray(data.inspections)) {
        throw new Error("Invalid inspection history response.");
      }

      setHistory(data.inspections);
      setHistoryError("");
    } catch {
      setHistoryError(
        "Could not load history. Make sure FastAPI is running."
      );
    }
  }

  // ============================================
  // File Upload
  // ============================================

  function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    setResult(null);
    setSelectedInspectionId(null);
    setError("");

    if (!selected) {
      return;
    }

    const accepted = [
      "image/png",
      "image/jpeg",
      "image/webp",
    ];

    if (!accepted.includes(selected.type)) {
      setFile(null);
      setPreview(null);
      setError(
        "Please select a PNG, JPEG, or WebP image."
      );
      event.target.value = "";
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      setFile(null);
      setPreview(null);
      setError("Image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setPreview(null);
    setFile(selected);
  }

  // ============================================
  // AI Screenshot Inspection
  // ============================================

  async function inspect(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!file || !expected.trim() || loading) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setSelectedInspectionId(null);

    const formData = new FormData();
    formData.append("image", file);
    formData.append(
      "expected_content",
      expected.trim()
    );

    try {
      const response = await fetch(
        `${API_URL}/api/inspect`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data: unknown = await response.json();

      if (!response.ok) {
        let message =
          `Inspection failed (${response.status}).`;

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
        throw new Error(
          "Invalid inspection response from backend."
        );
      }

      const inspection = data as InspectionResult;

      setResult(inspection);

      // Refresh SQLite inspection history.
      await loadHistory();

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not communicate with the backend."
      );
    } finally {
      setLoading(false);
    }
  }

  // ============================================
  // Reset
  // ============================================

  function reset() {
    if (loading) return;

    setFile(null);
    setPreview(null);
    setExpected("");
    setResult(null);
    setSelectedInspectionId(null);
    setError("");

    const fileInput = document.getElementById(
      "image"
    ) as HTMLInputElement | null;

    if (fileInput) {
      fileInput.value = "";
    }
  }

  // ============================================
  // View Saved Inspection
  // ============================================

  function viewInspection(
    inspection: SavedInspection
  ) {
    setSelectedInspectionId(inspection.id);

    setResult({
      status: inspection.status,
      summary: inspection.summary,
      issues: inspection.issues,
    });

    setError("");
  }

  // ============================================
  // React UI
  // ============================================

  return (
    <div className="app-shell">

      {/* Sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">V</div>

          <div>
            <strong>VisualQA</strong>
            <span>AI Inspection Platform</span>
          </div>
        </div>

        <div className="nav-label">
          WORKSPACE
        </div>

        <div className="nav-item active">
          ◈ &nbsp; Inspector
        </div>

        <div className="sidebar-footer">
          <span className="online-dot" />
          Local AI · Gemma 3
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">

        {/* Header */}
        <header className="topbar">
          <div>
            <div className="breadcrumb">
              Workspace / <span>Inspector</span>
            </div>

            <h1>Visual Inspection</h1>

            <p>
              Detect content inconsistencies and visual
              defects with local AI.
            </p>
          </div>

          <div className="local-badge">
            <span className="online-dot" />
            Local Mode
          </div>
        </header>

        {/* Main Workspace */}
        <div className="workspace">

          {/* Upload Panel */}
          <form
            className="panel input-panel"
            onSubmit={inspect}
          >
            <div className="panel-heading">
              <div>
                <h2>New Inspection</h2>
                <p>
                  Configure a screenshot quality check.
                </p>
              </div>

              <span className="step-pill">
                01 / 02
              </span>
            </div>

            <label
              className="field-label"
              htmlFor="image"
            >
              Display Screenshot
            </label>

            <label
              className="upload-zone"
              htmlFor="image"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Screenshot preview"
                  className="preview-image"
                />
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon">
                    ↑
                  </div>

                  <strong>
                    Click to upload a screenshot
                  </strong>

                  <span>
                    PNG, JPEG or WebP · Maximum 5 MB
                  </span>
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

                <span>
                  {(file.size / 1024).toFixed(0)} KB
                </span>
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
                setSelectedInspectionId(null);
              }}
              placeholder={
                "Example: The jackpot must display " +
                "$50,000,000. The heading must say " +
                "LOTTERY JACKPOT."
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
                  !file ||
                  !expected.trim() ||
                  loading
                }
              >
                {loading
                  ? "Analyzing screenshot..."
                  : "✦ Run AI Inspection"}
              </button>
            </div>

            {error && (
              <div
                className="error-message"
                role="alert"
              >
                {error}
              </div>
            )}
          </form>

          {/* Results Panel */}
          <section className="panel results-panel">
            <div className="panel-heading">
              <div>
                <h2>Inspection Results</h2>
                <p>
                  AI-generated quality assurance findings.
                </p>
              </div>

              <span className="step-pill">
                02 / 02
              </span>
            </div>

            {!result && !loading && (
              <div className="empty-state">
                <div className="empty-icon">
                  ◎
                </div>

                <h3>No inspection yet</h3>

                <p>
                  Upload a screenshot and run an
                  inspection to see detected issues here.
                </p>
              </div>
            )}

            {loading && (
              <div
                className="empty-state"
                role="status"
              >
                <div className="spinner" />

                <h3>Analyzing screenshot</h3>

                <p>
                  Gemma 3 is examining the display.
                  Local inference may take a while.
                </p>
              </div>
            )}

            {result && !loading && (
              <div className="result-content">

                {selectedInspectionId !== null && (
                  <div className="step-pill">
                    Viewing saved inspection
                    #{selectedInspectionId}
                  </div>
                )}

                <div
                  className={
                    `result-banner ${result.status.toLowerCase()}`
                  }
                >
                  <div>
                    <span>
                      INSPECTION STATUS
                    </span>

                    <h3>
                      {result.status}
                    </h3>
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
                  <h3>
                    Analysis Summary
                  </h3>

                  <p>{result.summary}</p>
                </div>

                <div className="issues-heading">
                  <h3>
                    Detected Issues
                  </h3>

                  <span>
                    {result.issues.length}
                  </span>
                </div>

                {result.issues.length === 0 ? (
                  <div className="no-issues">
                    No issues reported by the model.
                  </div>
                ) : (
                  <div className="issue-list">
                    {result.issues.map(
                      (issue, index) => (
                        <article
                          className="issue-card"
                          key={index}
                        >
                          <div className="issue-top">
                            <strong>
                              {issue.title}
                            </strong>

                            <span
                              className={
                                `severity ${issue.severity.toLowerCase()}`
                              }
                            >
                              {issue.severity}
                            </span>
                          </div>

                          <p>
                            {issue.description}
                          </p>
                        </article>
                      )
                    )}
                  </div>
                )}

                <p className="ai-disclaimer">
                  AI findings are advisory.
                  Verify issues before reporting
                  or releasing content.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* Inspection History */}
        <section className="panel history-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Inspection History
              </h2>

              <p>
                Review previous AI quality checks.
              </p>
            </div>

            <button
              className="secondary-button"
              type="button"
              onClick={() => void loadHistory()}
            >
              Refresh
            </button>
          </div>

          {historyError && (
            <p
              className="error-message"
              role="alert"
            >
              {historyError}
            </p>
          )}

          {history.length === 0 ? (
            <div className="history-empty">
              No saved inspections yet.
              Run your first inspection to get started.
            </div>
          ) : (
            <div className="history-list">
              {history.map((inspection) => (
                <button
                  key={inspection.id}
                  type="button"
                  className={
                    "history-item " +
                    (
                      selectedInspectionId ===
                      inspection.id
                        ? "selected"
                        : ""
                    )
                  }
                  onClick={() =>
                    viewInspection(inspection)
                  }
                >
                  <div className="history-item-main">
                    <strong>
                      {inspection.filename}
                    </strong>

                    <span>
                      {new Date(
                        inspection.created_at
                      ).toLocaleString()}
                    </span>
                  </div>

                  <div className="history-item-status">
                    <span
                      className={
                        "history-status " +
                        inspection.status.toLowerCase()
                      }
                    >
                      {inspection.status}
                    </span>

                    <small>
                      {inspection.issues.length} issue(s)
                    </small>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Footer */}
        <footer>
          VisualQA Inspector · Built with React,
          FastAPI, Ollama, Gemma 3 and SQLite
        </footer>

      </main>
    </div>
  );
}

export default App;