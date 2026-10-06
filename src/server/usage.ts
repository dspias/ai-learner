import { prisma } from "@/lib/db";
import { getPlan, type Plan } from "@/config/plans";
import { computePeriod, remaining } from "@/lib/quota";
import type { UsageTokens } from "@/lib/llm/types";

/** Thrown when a user has no tokens left in the current period. */
export class QuotaExceededError extends Error {
  constructor(
    public info: { plan: string; limit: number; used: number; periodEnd: Date },
  ) {
    super("QUOTA_EXCEEDED");
    this.name = "QuotaExceededError";
  }
}

export type QuotaStatus = {
  plan: Plan;
  used: number;
  limit: number;
  remaining: number;
  periodStart: Date;
  periodEnd: Date;
};

/**
 * Current-period quota status for a user. Advances (and persists) the period
 * anchor when a new period has started, so usage effectively resets per period
 * with no cron job.
 */
export async function getQuotaStatus(userId: string, now = new Date()): Promise<QuotaStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planPeriodStart: true },
  });
  if (!user) throw new Error("user not found");

  const plan = getPlan(user.plan);
  const { start, end } = computePeriod(user.planPeriodStart, plan.periodDays, now);

  if (start.getTime() !== user.planPeriodStart.getTime()) {
    await prisma.user.update({ where: { id: userId }, data: { planPeriodStart: start } });
  }

  const agg = await prisma.tokenUsage.aggregate({
    _sum: { totalTokens: true },
    where: { userId, createdAt: { gte: start } },
  });
  const used = agg._sum.totalTokens ?? 0;

  return {
    plan,
    used,
    limit: plan.tokenLimit,
    remaining: remaining(plan.tokenLimit, used),
    periodStart: start,
    periodEnd: end,
  };
}

/** Throws QuotaExceededError if the user is already at/over their period limit. */
export async function assertWithinQuota(userId: string): Promise<void> {
  const s = await getQuotaStatus(userId);
  if (s.used >= s.limit) {
    throw new QuotaExceededError({
      plan: s.plan.id,
      limit: s.limit,
      used: s.used,
      periodEnd: s.periodEnd,
    });
  }
}

/** User-facing message for a quota-exceeded (402) response. */
export function quotaMessage(info: { plan: string; limit: number; periodEnd: Date }): string {
  const plan = getPlan(info.plan);
  return `You've used your ${plan.name} plan's ${plan.tokenLimit.toLocaleString()} tokens for this period. Upgrade your plan in Settings, or wait until ${info.periodEnd.toLocaleDateString()}.`;
}

/** Append a usage record to the ledger. */
export async function recordUsage(params: {
  userId: string;
  feature: string;
  provider: string;
  model: string;
  usage: UsageTokens;
}): Promise<void> {
  const { userId, feature, provider, model, usage } = params;
  if (usage.totalTokens <= 0) return;
  await prisma.tokenUsage.create({
    data: {
      userId,
      feature,
      provider,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
    },
  });
}
