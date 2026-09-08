# AI Commands for Vicinae

Reusable text transformations using your locally authenticated Claude Code, Codex, or Grok CLI. Designed for Linux, with Hyprland / Wayland as the primary target.

Create a command once. Select text in another app, find the command **directly in Vicinae's main search**, run it, and press **Enter** when the result is ready to replace the selection.

## Install

Requires Vicinae 0.28.1 or later, Node.js 22 or later for development, and at least one current official CLI. Sign in through that CLI first. The extension uses its saved login; it does not ask for or store account tokens. Your account must include access to the chosen CLI and model. A website subscription alone does not establish that access.

From this repository:

```sh
npm ci
npm run build
```

The build installs the extension into Vicinae's local extension directory. For a separate distributable directory, use `npm run build -- --out dist` instead. Open **Check AI Harnesses** to verify executable detection and model discovery. If a CLI is installed in a custom location, set its absolute path in extension preferences.

Validated CLI baselines: Claude Code 2.1.263, Codex 0.153.4, Grok ACP 1.0.13. These integrations use current CLI features; older CLI versions may need updating.

## Create and run

1. Open **Create AI Command**.
2. Set its name, harness, model, thinking level, prompt, and optional system instruction.
3. Save with **Ctrl+Enter**. On Linux, a main-search entry is created automatically.
4. Select text in another application and open Vicinae. Search for the command's name and run it.
5. Review the answer. **Enter** pastes it into the original application; **Ctrl+C** copies it.

Use **AI Commands** to edit, duplicate, or delete commands. Editing updates the same main-search entry; deleting removes it. **Repair Main Search Entry** recreates an entry if you removed it manually. There is no need to open this management list for daily use.

Prompts support two literal placeholders:

| Placeholder   | Input                                        |
| ------------- | -------------------------------------------- |
| `{selection}` | Text highlighted when the command opens      |
| `{clipboard}` | Text on the clipboard when the command opens |

Example:

```text
Translate into English. Keep my tone. Use no long dashes.
Return only the translated text, without surrounding quotes.

{selection}
```

Placeholders are substituted once in the prompt. Text inserted through a placeholder is never treated as another template. The system instruction is literal. Both sources can be used in one prompt; only referenced sources are sent to the selected harness. Missing selection produces an error instead of silently sending clipboard contents.

The native Vicinae editor displays placeholders as ordinary text. Models and supported thinking levels come from the CLI at runtime, not from a fixed model list. **Harness default** leaves thinking to that harness. **Refresh Models** reloads the catalog.

## Results and history

Results are plain text. During generation, Enter does not paste a partial answer. **Ctrl+.** cancels the request. **Ctrl+R** on a completed result opens a short refinement prompt; the previous result can be restored from the actions menu.

**AI Command History** keeps up to 100 completed runs, bounded to about five million stored characters. It stores the command, referenced input, rendered prompt, and result locally in Vicinae's extension storage. Disable **Save input and results locally** in preferences to stop saving new history. Clear existing records through the history command. History failures do not discard a completed answer.

The selected provider receives the prompt and text. Claude and Codex requests disable local session persistence; Grok currently retains its own CLI session records. Turning off extension history does not control provider-side retention or the CLI's own logs. This extension has no telemetry and does not copy authentication files.

## Desktop integration

Linux commands get standard desktop entries in `$XDG_DATA_HOME/applications` (normally `~/.local/share/applications`). They contain only the command name, icon, and a Vicinae invocation with its ID, never the prompt or selected text. Vicinae watches that directory and indexes changes automatically. The entries can also appear in other Linux application menus.

The extension uses Vicinae's selection, window-management, and clipboard APIs. Before inserting, it closes the launcher, restores the original window, checks focus, and asks Vicinae to paste. Replacement works when the original editable control retains its selection and supports the platform paste mechanism. A selection in a read-only page can be transformed and copied, but cannot be replaced. Other desktops depend on their Vicinae clipboard/window backend and are not yet validated.

Deleting a command removes its desktop entry. Before uninstalling the extension, delete its commands if you also want to remove these entries. Commands created by this extension use the `vicinae-ai-command-*.desktop` prefix and an ownership marker. On non-Linux platforms the automatic entries are unavailable; an optional native Quicklink action is provided.

## Development

```sh
npm run check
npm run build -- --out dist
node scripts/check-build.mjs dist
npm run smoke
```

`check` runs TypeScript and deterministic tests. `smoke` lists installed harness models without generating text. `npm run smoke -- claude --generate` (or `codex` / `grok`) sends a dummy translation request and consumes normal account usage.

Codex generation ignores user agent configuration and uses its normal saved login. Catalog discovery explicitly selects the built-in OpenAI provider. An explicit `model_catalog_json` override is rejected because it supplies a custom catalog rather than current subscription models.

Vicinae bundles entrypoints as CommonJS. The Claude SDK must retain ESM semantics, so the build copies its unchanged `sdk.mjs` and notices into generated assets and loads it with a computed dynamic import. Do not replace this with a static runtime SDK import: its `createRequire(import.meta.url)` will crash inside a CommonJS bundle.

Native form text fields use `defaultValue`, and saving reads `Form.Values`. This avoids controlled-input focus/value synchronization problems observed with the target Vicinae build.

The extension code is MIT licensed. Dependencies, particularly the Claude Agent SDK, retain their own licenses and terms; the SDK's license and notices accompany the generated asset. No provider CLI binaries are bundled. The repository is ready for development and review; publication to GitHub or the Vicinae Store is a separate release step.

## Integration references

Provider choices were compared with [T3 Code](https://github.com/pingdotgg/t3code) at commit `4664c572a78231611491f63f677f0e007ebaab03`:

- [Claude text generation](https://github.com/pingdotgg/t3code/blob/4664c572a78231611491f63f677f0e007ebaab03/apps/server/src/textGeneration/ClaudeTextGeneration.ts) uses the installed CLI, disables tools/hooks, and checks completion. This extension uses the official Agent SDK around that CLI for model discovery and streaming.
- [Codex text generation](https://github.com/pingdotgg/t3code/blob/4664c572a78231611491f63f677f0e007ebaab03/apps/server/src/textGeneration/CodexTextGeneration.ts) uses `codex exec --ephemeral` with read-only access. This extension follows that single-request pattern and obtains models through `app-server` `model/list`.
- [Grok provider probing](https://github.com/pingdotgg/t3code/blob/4664c572a78231611491f63f677f0e007ebaab03/apps/server/src/provider/Layers/GrokProvider.ts) reads model metadata from ACP initialization without creating a session. This extension follows that pattern. Generation uses Grok's supported headless CLI stream, which directly accepts a custom system instruction.

The [Vicinae API source](https://github.com/vicinaehq/vicinae/tree/main/src/typescript/api/src) was checked alongside the installed API version. Native Quicklink creation opens a confirmation form; automatic Linux entries use standard desktop integration instead.
