import { MAX_TEXT_LENGTH, type InputSnapshot } from "./types";

const PLACEHOLDERS = /\{(selection|clipboard)\}/g;

export function inputSources(template: string): (keyof InputSnapshot)[] {
  return [
    ...new Set(
      [...template.matchAll(PLACEHOLDERS)].map(
        (match) => match[1] as keyof InputSnapshot,
      ),
    ),
  ];
}

export function renderTemplate(template: string, input: InputSnapshot): string {
  if (!template.trim())
    throw new Error("Write a prompt for this command first.");
  for (const source of inputSources(template)) {
    if (!input[source]?.trim()) {
      throw new Error(
        source === "selection"
          ? "No selected text is available. Select text in the source app, then run the command again."
          : "The clipboard does not contain text. Copy some text, then run the command again.",
      );
    }
  }
  // A single pass keeps placeholders inside selected/copied text literal.
  const rendered = template.replace(
    PLACEHOLDERS,
    (_match, source: keyof InputSnapshot) => input[source]!,
  );
  if (rendered.length > MAX_TEXT_LENGTH)
    throw new Error(
      "The input is too large. Select a smaller passage (up to 512,000 characters).",
    );
  return rendered;
}

export function plainTextMarkdown(text: string): string {
  let longestFence = 2;
  for (const match of text.matchAll(/`+/g))
    longestFence = Math.max(longestFence, match[0].length);
  const fence = "`".repeat(longestFence + 1);
  return `${fence}text\n${text}\n${fence}`;
}

export function refinementPrompt(
  originalPrompt: string,
  previousResult: string,
  instruction: string,
): string {
  if (!instruction.trim())
    throw new Error("Write an instruction for the refinement.");
  const prompt = `Original request:\n${originalPrompt}\n\nPrevious result:\n${previousResult}\n\nRefine the previous result with this instruction:\n${instruction}`;
  if (prompt.length > MAX_TEXT_LENGTH)
    throw new Error(
      "This conversation is too large to refine. Start a new run with a smaller passage.",
    );
  return prompt;
}
