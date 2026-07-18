import { useState, useEffect } from "react";

const ONBOARDED_KEY = "studymate_onboarded";

const STEPS = [
  {
    title: "Welcome to StudyMate AI",
    description: "Your AI-powered study assistant. Upload your notes, PDFs, and textbooks — then chat, quiz, and learn.",
    icon: "🚀",
  },
  {
    title: "Chat with your materials",
    description: "Ask any question about your uploaded documents. StudyMate will retrieve the most relevant content and generate answers at your chosen difficulty level.",
    icon: "💬",
    highlight: "Chat",
  },
  {
    title: "Generate flashcards & quizzes",
    description: "Turn any topic into interactive flashcards or multiple-choice quizzes to test your knowledge. Choose from beginner to exam-level difficulty.",
    icon: "🧠",
    highlight: "Flashcards & Quiz",
  },
  {
    title: "Session history",
    description: "All your conversations are saved. Use the sidebar to switch between sessions, rename them, or pick up where you left off.",
    icon: "📁",
    highlight: "Sidebar",
  },
  {
    title: "Ready to learn?",
    description: "Upload your first document or start a conversation right away. Good luck!",
    icon: "🎓",
  },
];

export default function OnboardingOverlay() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onboarded = localStorage.getItem(ONBOARDED_KEY);
    if (!onboarded) {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    localStorage.setItem(ONBOARDED_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface shadow-xl p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="inline-block text-4xl mb-3" role="img" aria-label="step icon">
            {current.icon}
          </span>
          <h2 className="font-display text-lg font-semibold text-ink">{current.title}</h2>
        </div>

        <p className="mb-6 text-sm text-ink-muted leading-relaxed text-center">{current.description}</p>

        <div className="mb-6 flex items-center justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? "w-6 bg-accent" : "w-1.5 bg-line"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Skip
          </button>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:border-accent hover:text-accent transition-all"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? dismiss() : setStep((s) => s + 1))}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white hover:bg-accent/90 transition-all shadow-sm"
            >
              {isLast ? "Get started" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
