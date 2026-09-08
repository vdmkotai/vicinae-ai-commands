import {
  Action,
  ActionPanel,
  Detail,
  Icon,
  List,
  openExtensionPreferences,
} from "@vicinae/api";
import { useEffect, useState } from "react";
import {
  HARNESS_IDS,
  HARNESS_NAMES,
  errorMessage,
  type HarnessId,
  type ModelInfo,
} from "./core/types";
import { plainTextMarkdown } from "./core/template";
import { discoverModels } from "./harnesses";
import { executableFor } from "./vicinae";

type Status = { path?: string; models?: ModelInfo[]; error?: string };
export default function CheckHarnesses() {
  const [statuses, setStatuses] = useState<Partial<Record<HarnessId, Status>>>(
    {},
  );
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatuses({});
    for (const harness of HARNESS_IDS)
      void (async () => {
        let status: Status;
        try {
          const path = await executableFor(harness);
          status = {
            path,
            models: await discoverModels(harness, path, controller.signal),
          };
        } catch (error) {
          status = { error: errorMessage(error) };
        }
        if (!controller.signal.aborted)
          setStatuses((previous) => ({ ...previous, [harness]: status }));
      })();
    return () => controller.abort();
  }, [refresh]);
  return (
    <List
      navigationTitle="Check AI Harnesses"
      isLoading={Object.keys(statuses).length < 3}
    >
      {HARNESS_IDS.map((harness) => {
        const status = statuses[harness];
        const description =
          status?.error ??
          (status?.models
            ? `${status.models.length} models available`
            : "Checking…");
        const markdown = status?.error
          ? plainTextMarkdown(status.error)
          : status?.models
            ? `Executable: ${status.path}\n\n${status.models.map((model) => `- **${model.name}** — ${model.id}\n  Thinking: ${model.efforts.join(", ") || "harness default"}`).join("\n")}\n\nA model catalog check does not make a generation request. Sign in to the official CLI in your terminal if generation asks for authentication.`
            : "Checking…";
        return (
          <List.Item
            key={harness}
            title={HARNESS_NAMES[harness]}
            subtitle={description}
            icon={
              status?.error
                ? Icon.Exclamationmark
                : status?.models
                  ? Icon.CheckCircle
                  : Icon.Clock
            }
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Details"
                  target={<Detail markdown={markdown} />}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={() => setRefresh((value) => value + 1)}
                />
                <Action
                  title="Open Extension Preferences"
                  icon={Icon.Cog}
                  onAction={openExtensionPreferences}
                />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
