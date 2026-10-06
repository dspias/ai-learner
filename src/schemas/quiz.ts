import { z } from "zod";

// --- LLM output: a generated quiz ---
export const generatedQuizQuestionSchema = z.object({
  type: z.enum(["mcq", "short_answer", "coding"]),
  question: z.string().min(1).max(4000),
  options: z.array(z.string().min(1).max(600)).max(6).optional().default([]),
  correctAnswer: z.string().min(1).max(4000),
  concept: z.string().min(1).max(160),
});

export const generatedQuizSchema = z.object({
  questions: z.array(generatedQuizQuestionSchema).min(1).max(10),
});

export type GeneratedQuizQuestion = z.infer<typeof generatedQuizQuestionSchema>;

// --- LLM output: grading of free-response items ---
export const gradedItemSchema = z.object({
  index: z.number().int().min(0),
  isCorrect: z.boolean(),
  feedback: z.string().max(2000).optional().default(""),
  misconception: z.string().max(160).optional().default(""),
});

export const gradedSchema = z.object({
  items: z.array(gradedItemSchema),
});

// --- client -> server: submit answers ---
export const submitAnswersSchema = z.object({
  answers: z
    .array(
      z.object({
        itemId: z.string().min(1),
        answer: z.string().max(10000),
      }),
    )
    .min(1),
});

export type SubmitAnswers = z.infer<typeof submitAnswersSchema>;
