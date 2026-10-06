import { z } from "zod";

// The LLM assigns each topic a stable `key` (kebab-case slug) and references
// prerequisites by those keys. Our code maps keys -> DB ids on save; the LLM
// never sees or sets database ids.

export const generatedTopicSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/, "key must be kebab-case (a-z, 0-9, -)"),
  title: z.string().min(1).max(200),
  summary: z.string().max(400).default(""),
  prerequisiteKeys: z.array(z.string()).default([]),
});

export const generatedMilestoneSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(600).optional().default(""),
  topics: z.array(generatedTopicSchema).min(1),
});

export const generatedTreeSchema = z.object({
  goalTitle: z.string().min(1).max(200),
  milestones: z.array(generatedMilestoneSchema).min(1),
});

export type GeneratedTopic = z.infer<typeof generatedTopicSchema>;
export type GeneratedMilestone = z.infer<typeof generatedMilestoneSchema>;
export type GeneratedTree = z.infer<typeof generatedTreeSchema>;

// Shape the client POSTs back to save a goal (after the user has edited the tree).
export const saveGoalSchema = z.object({
  title: z.string().min(1).max(200),
  background: z.string().max(5000).default(""),
  language: z.string().min(1).max(60).default("English"),
  targetDate: z.string().datetime().nullable().optional(),
  dailyMinutes: z.number().int().min(5).max(600),
  milestones: z
    .array(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(600).default(""),
        topics: z
          .array(
            z.object({
              key: z.string().min(1),
              title: z.string().min(1).max(200),
              summary: z.string().max(400).default(""),
              prerequisiteKeys: z.array(z.string()).default([]),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type SaveGoalInput = z.infer<typeof saveGoalSchema>;
