import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  desktopEntryPath,
  desktopEntryText,
  publishDesktopEntry,
  removeDesktopEntry,
} from "../src/core/desktop-entry";
import type { AICommand } from "../src/core/types";

const command: AICommand = {
  schemaVersion: 1,
  id: "a4a3b161-49ae-4b1d-afc7-0ca96ff462ef",
  name: "Перевести на английский",
  prompt: "{selection}",
  systemPrompt: "",
  harness: "claude",
  model: "default",
  effort: "",
  createdAt: "now",
  updatedAt: "now",
};

test("saving, renaming, and deleting a command keep a single main-search entry and preserve other apps", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-desktop-test-"));
  const options = {
    directory,
    entrypoint: "@owner/ai-commands:run-ai-command",
    executable: "/usr/bin/vicinae",
    icon: "/tmp/icon.svg",
  };
  try {
    const other = join(directory, "unrelated.desktop");
    await writeFile(other, "Unrelated app");
    await publishDesktopEntry(command, options);
    await publishDesktopEntry({ ...command, name: "Rephrase" }, options);
    assert.equal((await readdir(directory)).length, 2);
    const text = await readFile(desktopEntryPath(command.id, options), "utf8");
    assert.ok(text.includes("Name=Rephrase\n"));
    assert.ok(
      text.includes('"cmd" "launch" "@owner/ai-commands:run-ai-command"'),
    );
    assert.ok(!text.includes("{selection}"));
    await removeDesktopEntry(command.id, options);
    await removeDesktopEntry(command.id, options);
    assert.deepEqual(await readdir(directory), ["unrelated.desktop"]);
    assert.equal(await readFile(other, "utf8"), "Unrelated app");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("desktop data cannot inject a new key, path traversal, or shell command", () => {
  const options = {
    directory: "/tmp/apps",
    entrypoint: "@owner/ai-commands:run-ai-command",
    executable: '/tmp/dir $x/"launcher"',
    icon: "/tmp/icon.svg",
  };
  const text = desktopEntryText(
    { ...command, name: "Hello\nExec=bad", id: '../../evil" $x %f' },
    options,
  );
  assert.equal(
    text.split("\n").filter((line) => line.startsWith("Exec=")).length,
    1,
  );
  assert.ok(text.includes("Name=Hello Exec=bad\n"));
  assert.ok(text.includes("%%f"));
  assert.throws(
    () =>
      desktopEntryText(command, {
        ...options,
        executable: "/tmp/bin%name/vicinae",
      }),
    /paths containing %/,
  );
  assert.match(
    desktopEntryPath("../../evil", options),
    /^\/tmp\/apps\/vicinae-ai-command-[a-f0-9]+\.desktop$/,
  );
});

test("deletion refuses a launcher file whose ownership marker was removed", async () => {
  const directory = await mkdtemp(join(tmpdir(), "ai-desktop-test-"));
  const options = {
    directory,
    entrypoint: "@owner/ai-commands:run-ai-command",
    executable: "/usr/bin/vicinae",
    icon: "/tmp/icon.svg",
  };
  try {
    const path = desktopEntryPath(command.id, options);
    await writeFile(path, "Unrelated replacement");
    await assert.rejects(
      removeDesktopEntry(command.id, options),
      /not been removed/,
    );
    await assert.rejects(
      publishDesktopEntry(command, options),
      /not been overwritten/,
    );
    assert.equal(await readFile(path, "utf8"), "Unrelated replacement");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
