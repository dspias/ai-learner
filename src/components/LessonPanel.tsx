"use client";

import { useState } from "react";
import Markdown from "@/components/Markdown";

export default function LessonPanel({
  topicId,
  initialLessonMd,
  initialGeneratedAt,
}: {
  topicId: string;
  initialLessonMd: string | null;
  initialGeneratedAt: string | null;
}) {
  const [lessonMd, setLessonMd] = useState(initialLessonMd);
  const [generatedAt, setGeneratedAt] = useState(initialGeneratedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/lesson`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to generate lesson");
      setLessonMd(data.lessonMd);
      setGeneratedAt(data.generatedAt);
    } catch (e: any) {
      setError(e.message ?? "Failed to generate lesson");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Explanation
        </h2>
        {lessonMd && (
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Regenerating…" : "Regenerate"}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {lessonMd ? (
        <>
          <Markdown>{lessonMd}</Markdown>
          {generatedAt && (
            <p className="mt-4 text-xs text-slate-600">
              Generated {new Date(generatedAt).toLocaleString()}
            </p>
          )}
        </>
      ) : (
        <div className="py-6 text-center text-slate-400">
          <p className="mb-3 text-sm">
            No lesson yet. Generate one tailored to your background and this topic&apos;s
            prerequisites.
          </p>
          <button
            onClick={generate}
            disabled={loading}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Generating lesson…" : "Generate lesson"}
          </button>
        </div>
      )}
    </section>
  );
}
