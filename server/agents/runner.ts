import { getDb } from "../db";
import { agentRuns } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export type AgentStep = {
  stepName: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: unknown;
  timestamp: string;
};

export type AgentRunUpdate = {
  status?: typeof agentRuns.$inferSelect["status"];
  steps?: AgentStep[];
  outputData?: unknown;
  errorMessage?: string;
  campaignId?: number;
  startedAt?: Date;
  completedAt?: Date;
};

/** Update an agent run record in the database */
export async function updateAgentRun(runId: number, update: AgentRunUpdate) {
  const db = await getDb();
  if (!db) return;
  const set: Record<string, unknown> = {};
  if (update.status !== undefined) set.status = update.status;
  if (update.steps !== undefined) set.steps = update.steps;
  if (update.outputData !== undefined) set.outputData = update.outputData;
  if (update.errorMessage !== undefined) set.errorMessage = update.errorMessage;
  if (update.campaignId !== undefined) set.campaignId = update.campaignId;
  if (update.startedAt !== undefined) set.startedAt = update.startedAt;
  if (update.completedAt !== undefined) set.completedAt = update.completedAt;
  await db.update(agentRuns).set(set).where(eq(agentRuns.id, runId));
}

/** Append a step to an agent run's steps array */
export async function appendStep(runId: number, step: AgentStep, existingSteps: AgentStep[] = []) {
  const updated = [...existingSteps, step];
  await updateAgentRun(runId, { steps: updated });
  return updated;
}

/** Call LLM and return parsed JSON result */
export async function llmJson<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const rawContent = response.choices?.[0]?.message?.content ?? "{}";
  const content = typeof rawContent === "string" ? rawContent : "{}";
  // Extract JSON from potential markdown code blocks
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) ?? [null, content];
  const jsonStr = jsonMatch[1]?.trim() ?? content.trim();
  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    // Try to find JSON object/array in the response
    const objMatch = jsonStr.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (objMatch) return JSON.parse(objMatch[1]) as T;
    throw new Error(`LLM returned non-JSON: ${jsonStr.slice(0, 200)}`);
  }
}

/** Call LLM and return plain text */
export async function llmText(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
  const rawContent = response.choices?.[0]?.message?.content ?? "";
  return typeof rawContent === "string" ? rawContent : "";
}

/** Optimal posting times per platform (heuristic) */
export function getOptimalPostingTime(platform: string, offsetDays = 0): Date {
  const now = new Date();
  const base = new Date(now);
  base.setDate(base.getDate() + offsetDays);
  const times: Record<string, number> = {
    twitter: 9,
    linkedin: 8,
    facebook: 13,
    instagram: 11,
  };
  base.setHours(times[platform] ?? 10, 0, 0, 0);
  return base;
}
