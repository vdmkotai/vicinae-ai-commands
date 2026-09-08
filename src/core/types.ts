export const HARNESS_IDS = ["claude", "codex", "grok"] as const;
export type HarnessId = (typeof HARNESS_IDS)[number];
export const HARNESS_NAMES: Record<HarnessId, string> = {
  claude: "Claude Code",
  codex: "Codex",
  grok: "Grok",
};

export interface AICommand {
  schemaVersion: 1;
  id: string;
  name: string;
  prompt: string;
  systemPrompt: string;
  harness: HarnessId;
  model: string;
  effort: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  efforts: string[];
  defaultEffort?: string;
  isDefault?: boolean;
}

export interface InputSnapshot {
  selection?: string;
  clipboard?: string;
}

export interface HistoryEntry {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  command: AICommand;
  input: InputSnapshot;
  renderedPrompt: string;
  result: string;
}

export interface RunRequest {
  command: AICommand;
  prompt: string;
  executable: string;
  signal: AbortSignal;
  onText: (text: string) => void;
}

export const DEFAULT_SYSTEM_PROMPT =
  "You transform text according to the user's instruction. Return only the resulting plain text, without introductions, explanations, surrounding quotes, or Markdown fences unless explicitly requested. Do not use tools.";

export const MAX_TEXT_LENGTH = 512_000;

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
