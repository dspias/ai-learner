"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COMMON_LANGUAGES } from "@/lib/languages";

/**
 * Reusable save-on-click language picker. `endpoint` + `method` + `field`
 * control what it PUTs/PATCHes (profile default vs. a goal's language).
 */
export default function LanguageSelect({
  initial,
  endpoint,
  method = "PUT",
  field,
  label,
}: {
  initial: string;
  endpoint: string;
  method?: "PUT" | "PATCH";
  field: string;
  label: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save() {
    setState("saving");
    try {
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (!res.ok) throw new Error();
      setState("saved");
      router.refresh();
    } catch {
      setState("error");
    }
  }

  const listId = `lang-${field}`;
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="mb-1 block text-sm text-slate-300">{label}</label>
        <input
          list={listId}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setState("idle");
          }}
          className="w-56 rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <datalist id={listId}>
          {COMMON_LANGUAGES.map((l) => (
            <option key={l} value={l} />
          ))}
        </datalist>
      </div>
      <button
        onClick={save}
        disabled={state === "saving" || !value.trim() || value === initial}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {state === "saving" ? "Saving…" : "Save"}
      </button>
      <span
        className={
          state === "error" ? "text-xs text-red-400" : "text-xs text-slate-500"
        }
      >
        {state === "saved" ? "Saved" : state === "error" ? "Save failed" : ""}
      </span>
    </div>
  );
}
