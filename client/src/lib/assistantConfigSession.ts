const KEY = "blastly_assistant_config";

export type AssistantConfigDraft = {
  assistantName: string;
  assistantTone: string;
  assistantPersonality: string;
  savedAt: string;
};

export function saveAssistantConfigDraft(config: Omit<AssistantConfigDraft, "savedAt">): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    KEY,
    JSON.stringify({ ...config, savedAt: new Date().toISOString() })
  );
}

export function loadAssistantConfigDraft(): AssistantConfigDraft | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AssistantConfigDraft;
  } catch {
    return null;
  }
}

export function clearAssistantConfigDraft(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
}
