import { useState, useCallback } from "react";
import DifficultyToggle from "../components/DifficultyToggle";
import LanguageSelector from "../components/LanguageSelector";
import ErrorBanner from "../components/ErrorBanner";
import SourceCitation from "../components/SourceCitation";
import { LoadingDots } from "../components/LoadingSkeleton";
import { useSession } from "../context/SessionContext";
import { generateQuiz } from "../api/endpoints";

export default function QuizPage() {
  const { difficultyLevel, setDifficultyLevel, language, setLanguage, sessionId, messages } = useSession();
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState(null);
  const [sources, setSources] = useState([]);
  const [sufficientContext, setSufficientContext] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const hasConversation = messages.some((m) => m.role === "assistant" && m.content);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError(null);
    setQuestions(null);
    setAnswers({});
    setSubmitted(false);
    setIsGenerating(true);
    try {
      const data = await generateQuiz({ topic: topic.trim() || undefined, sessionId, count, difficultyLevel, language });
      setQuestions(data.questions);
      setSources(data.sources || []);
      setSufficientContext(data.sufficient_context);
      if (!data.sufficient_context || !data.questions?.length) {
        setError("Not enough material found to generate quiz questions. Try uploading more documents.");
      }
    } catch (err) {
      setError(err.message || "Failed to generate quiz.");
    } finally {
      setIsGenerating(false);
    }
  }, [topic, sessionId, count, difficultyLevel, language]);

  const selectAnswer = useCallback((qIdx, optIdx) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  }, [submitted]);

  const handleSubmitQuiz = useCallback(() => {
    setSubmitted(true);
  }, []);

  const score = submitted && questions
    ? questions.reduce((acc, q, i) => acc + (answers[i] === q.correct_index ? 1 : 0), 0)
    : 0;

  const allAnswered = questions && Object.keys(answers).length === questions.length;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-6 pb-24 sm:pb-6">
        <div className="mb-6">
          <h1 className="font-display text-xl text-ink">Quiz Mode</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Test your knowledge with multiple-choice questions generated from your documents.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-xl border border-line bg-surface p-5 shadow-sm">
          <div className="mb-4">
            <label htmlFor="quiz-topic" className="mb-1.5 block text-sm font-medium text-ink">Topic</label>
            <input
              id="quiz-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={
                hasConversation
                  ? "Leave blank to use your current chat as context"
                  : "e.g. Photosynthesis"
              }
              className="w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-[15px] text-ink placeholder:text-ink-muted focus:border-accent focus:shadow-glow transition-all"
            />
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label htmlFor="quiz-count" className="text-sm text-ink-muted">Questions:</label>
              <select
                id="quiz-count"
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                className="appearance-none rounded-lg border border-line bg-paper px-2.5 py-1.5 pr-7 text-sm text-ink shadow-sm focus:border-accent focus:shadow-glow transition-all"
              >
                {[3, 5, 10, 15, 20].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <DifficultyToggle value={difficultyLevel} onChange={setDifficultyLevel} />
            <LanguageSelector value={language} onChange={setLanguage} id="quiz-lang" />
          </div>

          <button
            type="submit"
            disabled={isGenerating || (!topic.trim() && !sessionId)}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {isGenerating ? "Generating..." : "Generate quiz"}
          </button>
        </form>

        <div className="mt-6 space-y-4">
          {error && !sufficientContext && <ErrorBanner message={error} />}

          {isGenerating && !error && <LoadingDots label="Creating quiz questions..." />}

          {questions && questions.length > 0 && (
            <div className="space-y-6 animate-fade-in">
              {submitted && (
                <div className={`rounded-xl border p-4 text-center shadow-sm ${
                  score === questions.length
                    ? "border-success/30 bg-success/5"
                    : score >= questions.length / 2
                    ? "border-warning/30 bg-warning/5"
                    : "border-danger/30 bg-danger/5"
                }`}>
                  <p className="text-lg font-semibold text-ink">
                    {score} / {questions.length} correct ({Math.round((score / questions.length) * 100)}%)
                  </p>
                  <p className="text-sm text-ink-muted mt-1">
                    {score === questions.length
                      ? "Perfect score! You've mastered this topic."
                      : score >= questions.length / 2
                      ? "Good effort! Review the explanations below."
                      : "Keep studying! Read the explanations and try again."}
                  </p>
                </div>
              )}

            {questions.map((q, qIdx) => {
              const selected = answers[qIdx];
              const correct = submitted && q.correct_index;
              const isCorrect = submitted && selected === q.correct_index;
              const isWrong = submitted && selected !== undefined && !isCorrect;

              return (
                <div
                  key={qIdx}
                  className={`rounded-xl border p-5 shadow-sm transition-all ${
                    submitted
                      ? isCorrect
                        ? "border-success/30 bg-success/5"
                        : isWrong
                        ? "border-danger/30 bg-danger/5"
                        : "border-line bg-surface"
                      : selected !== undefined
                      ? "border-accent/30 bg-accent/5"
                      : "border-line bg-surface"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    {q.topic && (
                      <span className="rounded-full border border-line/60 bg-paper px-2 py-0.5 text-[10px] font-mono text-ink-muted">
                        {q.topic}
                      </span>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted/60">
                      Question {qIdx + 1} of {questions.length}
                    </span>
                  </div>
                  <p className="mb-3 text-base font-medium text-ink leading-relaxed">{q.question}</p>

                  <div className="space-y-2">
                    {q.options.map((opt, oIdx) => {
                      let optionClass = "border-line bg-paper hover:border-accent/40 hover:bg-accent/5";
                      if (submitted) {
                        if (oIdx === q.correct_index) {
                          optionClass = "border-success bg-success/10 ring-1 ring-success/30";
                        } else if (oIdx === selected && oIdx !== q.correct_index) {
                          optionClass = "border-danger bg-danger/10 ring-1 ring-danger/30";
                        } else {
                          optionClass = "border-line/50 bg-paper/50 opacity-60";
                        }
                      } else if (oIdx === selected) {
                        optionClass = "border-accent bg-accent/10 ring-1 ring-accent/30";
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => selectAnswer(qIdx, oIdx)}
                          disabled={submitted}
                          className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm text-ink transition-all ${optionClass} disabled:cursor-default`}
                        >
                          <span className="flex items-start gap-3">
                            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                              submitted && oIdx === q.correct_index
                                ? "border-success text-success"
                                : submitted && oIdx === selected && oIdx !== q.correct_index
                                ? "border-danger text-danger"
                                : oIdx === selected
                                ? "border-accent text-accent"
                                : "border-line text-ink-muted"
                            }`}>
                              {submitted && oIdx === q.correct_index ? "✓" : submitted && oIdx === selected && oIdx !== q.correct_index ? "✗" : String.fromCharCode(65 + oIdx)}
                            </span>
                            <span>{opt}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {submitted && (
                    <div className="mt-3 rounded-lg border border-line/60 bg-paper p-3 text-sm">
                      <p className="font-medium text-ink">Explanation:</p>
                      <p className="mt-1 text-ink-muted leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-center gap-3">
              {!submitted && (
                <button
                  type="button"
                  onClick={handleSubmitQuiz}
                  disabled={!allAnswered}
                  className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {allAnswered ? "Submit answers" : `Answer all questions to submit (${Object.keys(answers).length}/${questions.length})`}
                </button>
              )}
              {submitted && (
                <button
                  type="button"
                  onClick={() => {
                    setAnswers({});
                    setSubmitted(false);
                  }}
                  className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink hover:border-accent hover:text-accent transition-all shadow-sm"
                >
                  Retry quiz
                </button>
              )}
            </div>

            {sources.length > 0 && (
              <details className="group rounded-xl border border-line overflow-hidden shadow-sm">
                <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-ink-muted hover:text-ink transition-colors">
                  <span>Sources ({sources.length})</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-open:rotate-180">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </summary>
                <div className="border-t border-line px-4 py-3">
                  <SourceCitation sources={sources} />
                </div>
              </details>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
