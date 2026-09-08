import type { HarnessId, ModelInfo, RunRequest } from "../core/types";
import { claudeModels, runClaude } from "./claude";
import { codexModels, runCodex } from "./codex";
import { grokModels, runGrok } from "./grok";

export async function discoverModels(
  harness: HarnessId,
  executable: string,
  signal?: AbortSignal,
): Promise<ModelInfo[]> {
  const models = await {
    claude: claudeModels,
    codex: codexModels,
    grok: grokModels,
  }[harness](executable, signal);
  const distinct = [
    ...new Map(models.map((model) => [model.id, model])).values(),
  ];
  if (!distinct.length)
    throw new Error(
      "The harness returned no available models. Check its login, then refresh.",
    );
  return distinct;
}

export async function runHarness(request: RunRequest): Promise<string> {
  request.signal.throwIfAborted();
  const result = await { claude: runClaude, codex: runCodex, grok: runGrok }[
    request.command.harness
  ](request);
  request.signal.throwIfAborted();
  return result;
}
