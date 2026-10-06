"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";

type SaveState = "idle" | "saving" | "saved" | "error";

export default function NotesEditor({
  topicId,
  initialMd,
}: {
  topicId: string;
  initialMd: string;
}) {
  const [value, setValue] = useState(initialMd);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [state, setState] = useState<SaveState>("idle");
  const lastSaved = useRef(initialMd);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced autosave whenever the value diverges from what we last persisted.
  useEffect(() => {
    if (value === lastSaved.current) return;
    if (timer.current) clearTimeout(timer.current);
    setState("saving");
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/topics/${topicId}/note`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentMd: value }),
        });
        if (!res.ok) throw new Error();
        lastSaved.current = value;
        setState("saved");
      } catch {
        setState("error");
      }
    }, 800);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value, topicId]);

  const label =
    state === "saving"
      ? "Saving…"
      : state === "saved"
        ? "Saved"
        : state === "error"
          ? "Save failed"
          : "";

  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
          Notes
        </h2>
        <div className="flex items-center gap-3">
          <span
            className={
              state === "error" ? "text-xs text-red-400" : "text-xs text-slate-500"
            }
          >
            {label}
          </span>
          <div className="flex rounded-md border border-slate-700 text-xs">
            <button
              onClick={() => setTab("edit")}
              className={`px-2 py-1 ${tab === "edit" ? "bg-slate-800 text-slate-100" : "text-slate-400"}`}
            >
              Edit
            </button>
            <button
              onClick={() => setTab("preview")}
              className={`px-2 py-1 ${tab === "preview" ? "bg-slate-800 text-slate-100" : "text-slate-400"}`}
            >
              Preview
            </button>
          </div>
        </div>
      </div>

      {tab === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={10}
          placeholder="Your notes (Markdown + $math$ supported). Autosaves."
          className="w-full resize-y rounded-md border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm outline-none focus:border-blue-500"
        />
      ) : value.trim() ? (
        <Markdown>{value}</Markdown>
      ) : (
        <p className="text-sm text-slate-500">Nothing to preview yet.</p>
      )}
    </section>
  );
}
