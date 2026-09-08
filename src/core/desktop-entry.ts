import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import type { AICommand } from "./types";

export interface DesktopEntryOptions {
  directory: string;
  entrypoint: string;
  executable: string;
  icon: string;
}

export function applicationsDirectory(): string {
  const dataHome = process.env.XDG_DATA_HOME;
  return join(
    dataHome && isAbsolute(dataHome)
      ? dataHome
      : join(homedir(), ".local", "share"),
    "applications",
  );
}

function field(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// Desktop Exec is parsed as argv, not as a shell command. It has its own
// quoting and percent-field syntax, applied after desktop string unescaping.
function argument(value: string): string {
  return field(
    '"' + value.replace(/[\\"`$]/g, "\\$&").replace(/%/g, "%%") + '"',
  );
}

export function desktopEntryPath(
  commandId: string,
  options: DesktopEntryOptions,
): string {
  const identity = createHash("sha256")
    .update(options.entrypoint + "\0" + commandId)
    .digest("hex");
  return join(options.directory, `vicinae-ai-command-${identity}.desktop`);
}

export function desktopEntryText(
  command: AICommand,
  options: DesktopEntryOptions,
): string {
  if (options.executable.includes("%"))
    throw new Error(
      "Vicinae cannot launch desktop entries from executable paths containing %. Install its launcher in a standard bin directory.",
    );
  return [
    "[Desktop Entry]",
    "Type=Application",
    `Name=${field(command.name.replace(/[\r\n]+/g, " "))}`,
    "Comment=Transform text with AI Commands",
    `Icon=${field(options.icon)}`,
    `Exec=${[options.executable, "cmd", "launch", options.entrypoint, command.id].map(argument).join(" ")}`,
    "Terminal=false",
    "StartupNotify=false",
    "Categories=Utility;",
    "Keywords=AI;Translate;Rewrite;Vicinae;",
    "X-Vicinae-AI-Commands=true",
    "",
  ].join("\n");
}

export async function publishDesktopEntry(
  command: AICommand,
  options: DesktopEntryOptions,
): Promise<void> {
  await mkdir(options.directory, { recursive: true });
  const destination = desktopEntryPath(command.id, options);
  try {
    const current = await readFile(destination, "utf8");
    if (!current.split("\n").includes("X-Vicinae-AI-Commands=true"))
      throw new Error(
        "The main-search entry was replaced by another file. It has not been overwritten.",
      );
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const temporary = join(options.directory, `.vicinae-ai-${randomUUID()}.tmp`);
  try {
    await writeFile(temporary, desktopEntryText(command, options), {
      encoding: "utf8",
      mode: 0o600,
      flag: "wx",
    });
    // Atomic rename also triggers Vicinae's application-directory watcher.
    await rename(temporary, destination);
  } finally {
    await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}

export async function removeDesktopEntry(
  commandId: string,
  options: DesktopEntryOptions,
): Promise<void> {
  const path = desktopEntryPath(commandId, options);
  let content: string;
  try {
    content = await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return;
    throw error;
  }
  if (!content.split("\n").includes("X-Vicinae-AI-Commands=true"))
    throw new Error(
      "The main-search entry was replaced by another file. It has not been removed.",
    );
  await unlink(path);
}
