import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Client from "../../shared/api/Client";
import AppShell from "../../shared/components/AppShell";
import "../../App.css";

export default function CodingQuestionPlan() {
  const { examId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const plannedQuestionCount = Number(location.state?.questionCount);
  const [planningPrompt, setPlanningPrompt] = useState("");
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(false);

  async function generatePlan() {
    if (!planningPrompt.trim()) {
      alert("Please describe the coding assessment topic and target skills.");
      return;
    }

    setLoading(true);
    try {
      const res = await Client.post("/admin/ai/coding-plan", {
        prompt: planningPrompt,
        questionCount: plannedQuestionCount
      });

      const generatedPlan = res.data;

      setPlan({
        topic: generatedPlan.topic || planningPrompt,
        questionCount: plannedQuestionCount || Math.max(1, Number(generatedPlan.questionCount) || 1),
        difficulty: generatedPlan.difficulty || "MEDIUM",
        targetComplexity: generatedPlan.targetComplexity || "",
        constraints: generatedPlan.constraints || "",
        testCaseFocus: generatedPlan.testCaseFocus || "",
        additionalInstructions: generatedPlan.additionalInstructions || ""
      });
    } catch (error) {
      console.error("AI planning failed", error);
      alert(error?.response?.data?.message || "AI planning failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function continueToGenerator() {
    if (!plan) {
      alert("Please generate an AI plan first.");
      return;
    }

    navigate(`/admin/exams/${examId}/coding-ai`, { state: { plan } });
  }

  return (
    <AppShell
      title="AI Coding Assessment Planner"
      subtitle="Define your technical assessment goals. AI generates an architectural blueprint for coding problems."
      activeNav="/admin/create-exam"
    >
      <div className="exam-container" style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Planning Brief Card */}
        <div className="card">
          <div className="hero-badge">Exam ID: #{examId} · AI Blueprint Designer</div>
          <h3 style={{ fontSize: "1.2rem", marginBottom: 12 }}>Assessment Specifications</h3>

          <div className="field-stack">
            <label>Describe the Target Subject, Candidate Level, and Focus Topics</label>
            <textarea
              value={planningPrompt}
              placeholder="e.g. Design 3 progressive algorithms questions for third-year CS students. Focus on Dynamic Programming (Knapsack & LCS), Graph Traversals (BFS/DFS), and Two-Pointer arrays with optimal O(N) constraints and comprehensive edge cases."
              onChange={(e) => setPlanningPrompt(e.target.value)}
              style={{ minHeight: 120 }}
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <button
              className="primary-btn"
              onClick={generatePlan}
              disabled={loading}
            >
              {loading ? "Synthesizing AI Plan..." : "✨ Generate AI Curriculum Blueprint"}
            </button>
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="card" style={{ textAlign: "center", padding: 40 }}>
            <div className="hero-badge">Generating Blueprint</div>
            <div className="skeleton-card" />
          </div>
        )}

        {/* Generated Plan Preview */}
        {plan && (
          <div className="card question-preview">
            <div className="question-preview-header">
              <div>
                <h3 style={{ fontSize: "1.2rem", color: "var(--text-primary)" }}>Generated Coding Plan</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 2 }}>
                  Review the blueprint structure before generating questions and test cases.
                </p>
              </div>
              <span className="status-chip approved">
                {plan.questionCount} Problems · {plan.difficulty}
              </span>
            </div>

            <div className="meta-grid" style={{ marginTop: 16 }}>
              <div className="meta-item">
                <span>Core Topic</span>
                <strong>{plan.topic}</strong>
              </div>
              <div className="meta-item">
                <span>Difficulty Tier</span>
                <strong>{plan.difficulty}</strong>
              </div>
              <div className="meta-item" style={{ gridColumn: "span 2" }}>
                <span>Target Complexity</span>
                <strong>{plan.targetComplexity || "Optimal Time & Space (e.g. O(N))"}</strong>
              </div>
              <div className="meta-item" style={{ gridColumn: "span 2" }}>
                <span>Testcase Focus Areas</span>
                <strong>{plan.testCaseFocus || "Normal, boundary, empty inputs, and large scale inputs"}</strong>
              </div>
            </div>

            {plan.constraints && (
              <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: "12px 0" }}>
                <b>Constraints:</b> {plan.constraints}
              </p>
            )}

            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-subtle)" }}>
              <button className="submit-btn" onClick={continueToGenerator}>
                Proceed to Generate Coding Problems & Test Cases →
              </button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
