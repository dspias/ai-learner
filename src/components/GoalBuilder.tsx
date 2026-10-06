"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { COMMON_LANGUAGES } from "@/lib/languages";

type EditTopic = {
  key: string;
  title: string;
  summary: string;
  prerequisiteKeys: string[];
};
type EditMilestone = {
  localId: string;
  title: string;
  description: string;
  topics: EditTopic[];
};

function uid(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

function move<T>(arr: T[], from: number, to: number): T[] {
  if (to < 0 || to >= arr.length) return arr;
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export default function GoalBuilder({ defaultLanguage }: { defaultLanguage: string }) {
  const router = useRouter();

  const [goalTitle, setGoalTitle] = useState("Software Engineer → AI Engineer");
  const [background, setBackground] = useState("");
  const [language, setLanguage] = useState(defaultLanguage);
  const [targetDate, setTargetDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(45);

  const [tree, setTree] = useState<EditMilestone[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allTopics = useMemo(
    () =>
      (tree ?? []).flatMap((m) =>
        m.topics.map((t) => ({ key: t.key, title: t.title, milestone: m.title })),
      ),
    [tree],
  );

  async function generate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch("/api/goals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: goalTitle, background, dailyMinutes, language, targetDate }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      const edit: EditMilestone[] = data.tree.milestones.map((m: any) => ({
        localId: uid("m"),
        title: m.title,
        description: m.description ?? "",
        topics: m.topics.map((t: any) => ({
          key: t.key,
          title: t.title,
          summary: t.summary ?? "",
          prerequisiteKeys: t.prerequisiteKeys ?? [],
        })),
      }));
      setGoalTitle(data.tree.goalTitle || goalTitle);
      setTree(edit);
    } catch (e: any) {
      setError(e.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  function startBlank() {
    setTree([
      {
        localId: uid("m"),
        title: "Milestone 1",
        description: "",
        topics: [{ key: uid("t"), title: "Topic 1", summary: "", prerequisiteKeys: [] }],
      },
    ]);
  }

  function updateMilestone(localId: string, patch: Partial<EditMilestone>) {
    setTree((t) => t!.map((m) => (m.localId === localId ? { ...m, ...patch } : m)));
  }
  function updateTopic(localId: string, key: string, patch: Partial<EditTopic>) {
    setTree((t) =>
      t!.map((m) =>
        m.localId === localId
          ? { ...m, topics: m.topics.map((tp) => (tp.key === key ? { ...tp, ...patch } : tp)) }
          : m,
      ),
    );
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      // Drop prereq references whose target topic was deleted.
      const validKeys = new Set(allTopics.map((t) => t.key));
      const payload = {
        title: goalTitle,
        background,
        language,
        dailyMinutes,
        targetDate: targetDate ? new Date(targetDate).toISOString() : null,
        milestones: (tree ?? []).map((m) => ({
          title: m.title,
          description: m.description,
          topics: m.topics.map((t) => ({
            key: t.key,
            title: t.title,
            summary: t.summary,
            prerequisiteKeys: t.prerequisiteKeys.filter(
              (k) => k !== t.key && validKeys.has(k),
            ),
          })),
        })),
      };
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push(`/goals/${data.goalId}`);
    } catch (e: any) {
      setError(e.message ?? "Save failed");
      setSaving(false);
    }
  }

  const input =
    "w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500";
  const btn =
    "rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-40";

  return (
    <div className="space-y-8">
      {/* Goal form */}
      <section className="rounded-lg border border-slate-800 bg-slate-900/40 p-5">
        <h2 className="mb-4 text-lg font-semibold">1. Describe your goal</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-slate-300">Goal</label>
            <input className={input} value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-slate-300">
              Your background (experience, what you already know)
            </label>
            <textarea
              className={`${input} min-h-[90px]`}
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="e.g. 6 years backend engineer, strong Python, rusty on linear algebra, no ML yet."
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Target date (optional)</label>
            <input
              type="date"
              className={input}
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Minutes per day</label>
            <input
              type="number"
              min={5}
              max={600}
              className={input}
              value={dailyMinutes}
              onChange={(e) => setDailyMinutes(Number(e.target.value))}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm text-slate-300">
              Language for this goal
            </label>
            <input
              list="goal-languages"
              className={input}
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              placeholder="e.g. English, Spanish, Bengali"
            />
            <datalist id="goal-languages">
              {COMMON_LANGUAGES.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-slate-500">
              Lessons, quizzes, and the topic map are generated in this language. The tutor
              also replies in whatever language you message it in.
            </p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={generate}
            disabled={generating || !goalTitle.trim()}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
          >
            {generating ? "Generating topic map…" : tree ? "Regenerate" : "Generate topic map"}
          </button>
          {!tree && (
            <button onClick={startBlank} className="rounded-md border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800">
              Start blank
            </button>
          )}
        </div>
      </section>

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Editable tree */}
      {tree && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">2. Edit the topic map</h2>
            <button
              onClick={() =>
                setTree((t) => [
                  ...(t ?? []),
                  {
                    localId: uid("m"),
                    title: `Milestone ${(t?.length ?? 0) + 1}`,
                    description: "",
                    topics: [{ key: uid("t"), title: "New topic", summary: "", prerequisiteKeys: [] }],
                  },
                ])
              }
              className={btn}
            >
              + Add milestone
            </button>
          </div>

          {tree.map((m, mi) => (
            <div key={m.localId} className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
              <div className="mb-3 flex items-start gap-2">
                <div className="flex-1">
                  <input
                    className={`${input} font-medium`}
                    value={m.title}
                    onChange={(e) => updateMilestone(m.localId, { title: e.target.value })}
                  />
                  <input
                    className={`${input} mt-2 text-sm text-slate-400`}
                    placeholder="Short description (optional)"
                    value={m.description}
                    onChange={(e) => updateMilestone(m.localId, { description: e.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <button className={btn} disabled={mi === 0} onClick={() => setTree((t) => move(t!, mi, mi - 1))}>
                    ↑
                  </button>
                  <button
                    className={btn}
                    disabled={mi === tree.length - 1}
                    onClick={() => setTree((t) => move(t!, mi, mi + 1))}
                  >
                    ↓
                  </button>
                  <button
                    className={`${btn} border-red-800 text-red-300`}
                    onClick={() => setTree((t) => t!.filter((x) => x.localId !== m.localId))}
                  >
                    ✕
                  </button>
                </div>
              </div>

              <ul className="space-y-2">
                {m.topics.map((t, ti) => (
                  <li key={t.key} className="rounded-md border border-slate-800 bg-slate-950/40 p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <input
                          className={input}
                          value={t.title}
                          onChange={(e) => updateTopic(m.localId, t.key, { title: e.target.value })}
                        />
                        <input
                          className={`${input} text-sm text-slate-400`}
                          placeholder="One-line summary"
                          value={t.summary}
                          onChange={(e) => updateTopic(m.localId, t.key, { summary: e.target.value })}
                        />
                        <details className="text-sm text-slate-400">
                          <summary className="cursor-pointer select-none">
                            Prerequisites ({t.prerequisiteKeys.length})
                          </summary>
                          <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded border border-slate-800 p-2">
                            {allTopics.filter((o) => o.key !== t.key).length === 0 && (
                              <div className="text-xs text-slate-500">No other topics yet.</div>
                            )}
                            {allTopics
                              .filter((o) => o.key !== t.key)
                              .map((o) => {
                                const checked = t.prerequisiteKeys.includes(o.key);
                                return (
                                  <label key={o.key} className="flex items-center gap-2 text-xs">
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={(e) =>
                                        updateTopic(m.localId, t.key, {
                                          prerequisiteKeys: e.target.checked
                                            ? [...t.prerequisiteKeys, o.key]
                                            : t.prerequisiteKeys.filter((k) => k !== o.key),
                                        })
                                      }
                                    />
                                    <span>
                                      {o.title}{" "}
                                      <span className="text-slate-600">· {o.milestone}</span>
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </details>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          className={btn}
                          disabled={ti === 0}
                          onClick={() =>
                            updateMilestone(m.localId, { topics: move(m.topics, ti, ti - 1) })
                          }
                        >
                          ↑
                        </button>
                        <button
                          className={btn}
                          disabled={ti === m.topics.length - 1}
                          onClick={() =>
                            updateMilestone(m.localId, { topics: move(m.topics, ti, ti + 1) })
                          }
                        >
                          ↓
                        </button>
                        <button
                          className={`${btn} border-red-800 text-red-300`}
                          onClick={() =>
                            updateMilestone(m.localId, {
                              topics: m.topics.filter((x) => x.key !== t.key),
                            })
                          }
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <button
                className={`${btn} mt-2`}
                onClick={() =>
                  updateMilestone(m.localId, {
                    topics: [
                      ...m.topics,
                      { key: uid("t"), title: "New topic", summary: "", prerequisiteKeys: [] },
                    ],
                  })
                }
              >
                + Add topic
              </button>
            </div>
          ))}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving || tree.length === 0}
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-500 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save goal"}
            </button>
            <span className="text-xs text-slate-500">
              You can refine titles, reorder, add/delete topics, and set prerequisites before saving.
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
