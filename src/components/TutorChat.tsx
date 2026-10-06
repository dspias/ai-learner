"use client";

import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";

type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

export default function TutorChat({
  topicId,
  initialMessages,
}: {
  topicId: string;
  initialMessages: ChatMessage[];
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, sending]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");
    const optimistic: ChatMessage = {
      id: `local-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, optimistic]);
    setSending(true);
    try {
      const res = await fetch(`/api/topics/${topicId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Tutor failed to respond");
      setMessages((m) => [...m, data.message]);
    } catch (e: any) {
      setError(e.message ?? "Tutor failed to respond");
    } finally {
      setSending(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <section className="flex h-[70vh] flex-col rounded-lg border border-slate-800 bg-slate-900/40">
      <div className="border-b border-slate-800 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
        Tutor
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-sm text-slate-500">
            Ask the tutor anything about this topic, or say &ldquo;start&rdquo; to begin. It
            knows your background and your past mistakes here.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-lg bg-blue-600/80 px-3 py-2 text-sm"
                  : "max-w-[90%] rounded-lg bg-slate-800 px-3 py-2"
              }
            >
              {m.role === "user" ? (
                <span className="whitespace-pre-wrap text-sm">{m.content}</span>
              ) : (
                <Markdown>{m.content}</Markdown>
              )}
            </div>
          </div>
        ))}
        {sending && <div className="text-sm text-slate-500">Tutor is thinking…</div>}
      </div>

      {error && (
        <div className="border-t border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      <div className="border-t border-slate-800 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={2}
          placeholder="Message the tutor…  (Enter to send, Shift+Enter for newline)"
          className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
