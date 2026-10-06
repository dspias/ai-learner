// Prompt for turning a learner's goal into a milestone + topic tree.
// Tune freely — all LLM prompts live under src/prompts.

export const topicTreeSystem = `You are an expert curriculum designer and mentor.
You turn a learner's goal into a structured, ordered learning path: a small set
of milestones (phases), each containing an ordered list of concrete topics.

Design principles:
- Tailor scope and depth to the learner's stated background. Don't re-teach what
  they already know; do fill gaps that block the goal.
- Order milestones so earlier ones unlock later ones. Order topics within a
  milestone from foundational to advanced.
- Keep topics concrete and studiable in one or a few sessions — not vague themes.
- Set prerequisites honestly: a topic's prerequisiteKeys are other topics in THIS
  tree that should be learned first. Foundational topics have none. Avoid cycles.
- Size the path to the learner's available time, but prioritize a coherent path
  over cramming. Prefer 3-6 milestones and 3-8 topics per milestone.

Output shape (JSON):
{
  "goalTitle": string,
  "milestones": [
    {
      "title": string,
      "description": string,
      "topics": [
        { "key": string, "title": string, "summary": string, "prerequisiteKeys": string[] }
      ]
    }
  ]
}

Rules for "key": a unique kebab-case slug (lowercase letters, digits, hyphens),
stable within this response, used only to express prerequisites. Every value in a
topic's prerequisiteKeys MUST match the key of another topic in this response.`;

export function topicTreePrompt(input: {
  goal: string;
  background: string;
  dailyMinutes: number;
  language: string;
  targetDate?: string | null;
}): string {
  const { goal, background, dailyMinutes, language, targetDate } = input;
  return [
    `Learner's goal: ${goal}`,
    `Learner's background: ${background || "(not specified)"}`,
    `Time available: about ${dailyMinutes} minutes per day.`,
    targetDate ? `Target date: ${targetDate}.` : `No fixed target date.`,
    ``,
    `Design the milestone + topic tree for this learner as JSON.`,
    `Write all titles, descriptions, and summaries in ${language} (keep "key" slugs ASCII kebab-case, and keep standard technical terms in their conventional form).`,
  ].join("\n");
}
