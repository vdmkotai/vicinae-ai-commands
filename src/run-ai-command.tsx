import { Detail, type LaunchProps } from "@vicinae/api";
import { useEffect, useState } from "react";
import { errorMessage, type AICommand } from "./core/types";
import { captureSource, repository, type SourceContext } from "./vicinae";
import { plainTextMarkdown } from "./core/template";
import { RunView } from "./ui/run-view";

export default function RunAICommand(
  props: LaunchProps<{ arguments: { commandId: string } }>,
) {
  const [loaded, setLoaded] = useState<{
    command: AICommand;
    context: SourceContext;
  }>();
  const [error, setError] = useState<string>();
  const commandId = props.arguments.commandId;
  useEffect(() => {
    let active = true;
    setLoaded(undefined);
    setError(undefined);
    void Promise.all([repository.command(commandId), captureSource()])
      .then(([command, context]) => {
        if (active) setLoaded({ command, context });
      })
      .catch((error) => {
        if (active) setError(errorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [commandId]);
  if (error) return <Detail markdown={plainTextMarkdown(error)} />;
  return loaded ? (
    <RunView {...loaded} />
  ) : (
    <Detail markdown="Preparing your command…" />
  );
}
