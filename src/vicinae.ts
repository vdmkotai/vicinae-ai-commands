import {
  Clipboard,
  Icon,
  LocalStorage,
  PopToRootType,
  WindowManagement,
  closeMainWindow,
  environment,
  getPreferenceValues,
  getSelectedText,
  popToRoot,
  showToast,
  Toast,
} from "@vicinae/api";
import { basename, join } from "node:path";
import { pathToFileURL } from "node:url";
import { Repository } from "./core/repository";
import {
  errorMessage,
  type AICommand,
  type HarnessId,
  type InputSnapshot,
} from "./core/types";
import { pasteResult } from "./core/paste";
import { resolveExecutable } from "./harnesses/process";
import { setClaudeSdkLocation } from "./harnesses/claude";
import {
  applicationsDirectory,
  publishDesktopEntry,
  removeDesktopEntry,
} from "./core/desktop-entry";

setClaudeSdkLocation(
  pathToFileURL(join(environment.assetsPath, "claude-sdk.mjs")).href,
);

export const repository = new Repository(LocalStorage);

export interface Preferences {
  claudePath?: string;
  codexPath?: string;
  grokPath?: string;
  saveHistory?: boolean;
}
export interface SourceContext {
  input: InputSnapshot;
  sourceWindow?: WindowManagement.Window;
  selectionError?: string;
  clipboardError?: string;
}

export function executableFor(harness: HarnessId): Promise<string> {
  return resolveExecutable(
    harness,
    getPreferenceValues<Preferences>()[`${harness}Path`],
  );
}

export async function captureSource(): Promise<SourceContext> {
  const [selection, clipboard, window] = await Promise.allSettled([
    getSelectedText(),
    Clipboard.readText(),
    WindowManagement.getActiveWindow(),
  ]);
  return {
    input: {
      ...(selection.status === "fulfilled"
        ? { selection: selection.value }
        : {}),
      ...(clipboard.status === "fulfilled"
        ? { clipboard: clipboard.value }
        : {}),
    },
    sourceWindow: window.status === "fulfilled" ? window.value : undefined,
    selectionError:
      selection.status === "rejected"
        ? errorMessage(selection.reason)
        : undefined,
    clipboardError:
      clipboard.status === "rejected"
        ? errorMessage(clipboard.reason)
        : undefined,
  };
}

export function quicklinkFor(command: AICommand) {
  const author = encodeURIComponent(environment.ownerOrAuthorName || "vdm");
  const extension = encodeURIComponent(
    basename(environment.supportPath) || environment.extensionName,
  );
  const args = encodeURIComponent(JSON.stringify({ commandId: command.id }));
  return {
    name: command.name,
    link: `vicinae://launch/@${author}/${extension}/run-ai-command?arguments=${args}`,
    icon: Icon.Stars,
    ...(process.platform === "linux"
      ? { application: "vicinae-url-handler.desktop" }
      : {}),
  };
}

async function desktopOptions() {
  return {
    directory: applicationsDirectory(),
    entrypoint: `@${environment.ownerOrAuthorName || "vdm"}/${basename(environment.supportPath) || environment.extensionName}:run-ai-command`,
    executable: await resolveExecutable("vicinae"),
    icon: join(environment.assetsPath, "icon.svg"),
  };
}

export async function publishCommand(command: AICommand): Promise<void> {
  if (process.platform !== "linux")
    throw new Error(
      "Automatic main-search entries currently require Linux. Use Add Quicklink in the actions menu on other platforms.",
    );
  await publishDesktopEntry(command, await desktopOptions());
}

export async function deleteCommand(command: AICommand): Promise<void> {
  if (process.platform === "linux")
    await removeDesktopEntry(command.id, await desktopOptions());
  try {
    await repository.deleteCommand(command.id);
  } catch (error) {
    if (process.platform === "linux") await publishCommand(command);
    throw error;
  }
}

let pasteInFlight = false;
export async function pasteToSource(
  text: string,
  context: SourceContext,
): Promise<void> {
  if (pasteInFlight) return;
  pasteInFlight = true;
  try {
    const window = context.sourceWindow;
    await pasteResult(text, window?.id, {
      sourceExists: async (id) =>
        (await WindowManagement.getWindows()).some(
          (candidate) => candidate.id === id,
        ),
      close: () =>
        closeMainWindow({
          clearRootSearch: true,
          popToRootType: PopToRootType.Suspended,
        }),
      focus: () => window!.focus(),
      activeWindowId: async () => {
        try {
          return (await WindowManagement.getWindows()).find(
            (window) => window.active,
          )?.id;
        } catch {
          return undefined;
        }
      },
      paste: (value) => Clipboard.paste({ text: value }),
    });
    await popToRoot({ clearSearchBar: true });
  } finally {
    pasteInFlight = false;
  }
}

export async function toastError(
  error: unknown,
  title = "AI Commands",
): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title,
    message: errorMessage(error).slice(0, 1500),
  });
}
