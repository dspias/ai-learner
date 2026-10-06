"use client";

import { useState } from "react";
import Markdown from "@/components/Markdown";

type Question = {
  id: string;
  type: "mcq" | "short_answer" | "coding";
  question: string;
  options: unknown; // string[] for mcq, else null
};

type Result = {
  id: string;
  type: string;
  question: string;
  options: unknown;
  userAnswer: string;
  correctAnswer: string | null;
  isCorrect: boolean;
  feedback: string;
  concept: string;
};

type GradeResponse = {
  score: number;
  numCorrect: number;
  numQuestions: number;
  mastery: number;
  status: string;
  nextReviewAt: string | null;
  results: Result[];
};

const statusLabel: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  learned: "Learned",
  needs_review: "Needs review",
};

type Phase = "intro" | "answering" | "results";

const typeLabel: Record<string, string> = {
  mcq: "Multiple choice",
  short_answer: "Short answer",
  coding: "Coding",
};

export default function QuizRunner({ topicId }: { topicId: string }) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [grade, setGrade] = useState<GradeResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/quiz/generate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate quiz");
      setQuestions(data.questions);
      setAttemptId(data.attemptId);
      setAnswers({});
      setGrade(null);
      setPhase("answering");
    } catch (e: any) {
      setError(e.message ?? "Failed to generate quiz");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!attemptId) return;
    setError(null);
    setBusy(true);
    try {
      const payload = {
        answers: questions.map((q) => ({ itemId: q.id, answer: answers[q.id] ?? "" })),
      };
      const res = await fetch(`/api/quiz/${attemptId}/grade`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to grade quiz");
      setGrade(data);
      setPhase("results");
    } catch (e: any) {
      setError(e.message ?? "Failed to grade quiz");
    } finally {
      setBusy(false);
    }
  }

  const answeredCount = questions.filter((q) => (answers[q.id] ?? "").trim()).length;

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {phase === "intro" && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-6 text-center">
          <p className="mb-4 text-sm text-slate-300">
            Generate a 5-question quiz tailored to this topic, your level, and your past
            mistakes. It mixes multiple-choice, short-answer, and (where relevant) coding
            questions, then grades with feedback.
          </p>
          <button
            onClick={generate}
            disabled={busy}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {busy ? "Generating quiz…" : "Generate quiz"}
          </button>
        </div>
      )}

      {phase === "answering" && (
        <>
          {questions.map((q, i) => (
            <div key={q.id} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Q{i + 1} · {typeLabel[q.type]}
              </div>
              <div className="mb-3">
                <Markdown>{q.question}</Markdown>
              </div>
              {q.type === "mcq" && Array.isArray(q.options) ? (
                <div className="space-y-2">
                  {(q.options as string[]).map((opt, oi) => (
                    <label
                      key={oi}
                      className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-800 px-3 py-2 text-sm hover:bg-slate-800/50"
                    >
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === opt}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                        className="mt-0.5"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                  rows={q.type === "coding" ? 6 : 3}
                  placeholder={q.type === "coding" ? "Write your code…" : "Your answer…"}
                  className={`w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500 ${
                    q.type === "coding" ? "font-mono" : ""
                  }`}
                />
              )}
            </div>
          ))}

          <div className="flex items-center gap-3">
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-500 disabled:opacity-50"
            >
              {busy ? "Grading…" : "Submit for grading"}
            </button>
            <span className="text-xs text-slate-500">
              {answeredCount}/{questions.length} answered
            </span>
          </div>
        </>
      )}

      {phase === "results" && grade && (
        <>
          <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-5 text-center">
            <div className="text-3xl font-semibold">{grade.score}%</div>
            <div className="text-sm text-slate-400">
              {grade.numCorrect} / {grade.numQuestions} correct
            </div>
            <div className="mt-2 text-sm text-slate-300">
              Mastery now <span className="font-medium">{grade.mastery}/100</span> ·{" "}
              {statusLabel[grade.status] ?? grade.status}
              {grade.nextReviewAt && (
                <> · next review {new Date(grade.nextReviewAt).toLocaleDateString()}</>
              )}
            </div>
          </div>

          {grade.results.map((r, i) => (
            <div
              key={r.id}
              className={`rounded-lg border p-4 ${
                r.isCorrect ? "border-green-700/50 bg-green-900/10" : "border-red-700/50 bg-red-900/10"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs uppercase tracking-wide text-slate-500">
                  Q{i + 1} · {typeLabel[r.type]}
                </span>
                <span className={r.isCorrect ? "text-sm text-green-400" : "text-sm text-red-400"}>
                  {r.isCorrect ? "Correct" : "Incorrect"}
                </span>
              </div>
              <div className="mb-2">
                <Markdown>{r.question}</Markdown>
              </div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-slate-500">Your answer: </span>
                  <span className="whitespace-pre-wrap">{r.userAnswer || "(blank)"}</span>
                </div>
                {!r.isCorrect && r.correctAnswer && (
                  <div>
                    <span className="text-slate-500">Expected: </span>
                    <span className="whitespace-pre-wrap">{r.correctAnswer}</span>
                  </div>
                )}
                <div className="mt-2 rounded-md bg-slate-900/60 px-3 py-2 text-slate-300">
                  <Markdown>{r.feedback}</Markdown>
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => setPhase("intro")}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            New quiz
          </button>
        </>
      )}
    </div>
  );
}
