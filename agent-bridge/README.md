# Office Werkstatt AI Agent Bridge V4

**Status: reference integration package, NOT a patch to the upstream Office Werkstatt repository.**

## What changed in V4

- `native/llama-cli-runner.mjs`: calls a **bundled or user-provided llama.cpp CLI executable** with a local GGUF model; no Ollama, hosted API, server, auto-download or internet required. JSON schema constrained generation is requested. It validates the resulting plan with the V3 tool whitelist.
- `native/local-service.mjs`: links the offline inference runner to V3 `AgentWorkflow` (preview -> approval -> edits -> undo).
- `electron/agent-ipc-v4.example.cjs` and `electron/agent-preload-v4.example.cjs`: safe IPC interface for the existing Electron desktop app. Electron main remains the authority for GGUF/executable paths.
- `examples/v4-demo.mjs`: end-to-end simulation using a fake local executable and **mock Office editor**, so it works without a GPU/model.
- `examples/real-model-smoke.mjs`: runnable local llama.cpp smoke test for a GGUF file, which does not modify documents.
- All 20 tests pass with Node 22 in this environment (16 previous tests + 4 new tests).

## Important terminology

This version **bundles a native llama.cpp CLI binary as a local child process**, not an in-process Rust/C++ FFI. It meets an app-contained, offline runtime goal when shipping the binary, but **does not yet deliver an in-process llama-cpp-2 Rust binding**. A real GGUF inference run was not possible in this environment because neither a llama.cpp binary nor model was supplied. No GPU performance claims are made.

## Run test/demo without any model

```sh
npm test
npm run demo:v4
```

## Run with your own GGUF model

1. Build/download the **official `llama-cli`** for your OS and architecture and place it in your app's trusted resources, alongside any required shared libraries. Source: https://github.com/ggml-org/llama.cpp
2. Obtain a **licensed GGUF file** for local inference, either bundle it with the distribution or let a user import it from disk. Never automatically fetch models in offline mode.
3. From this folder:

```sh
node examples/real-model-smoke.mjs /absolute/path/to/llama-cli /absolute/path/to/model.gguf
```

On Windows, supply quoted absolute paths and `llama-cli.exe`. The runner uses flags described by llama.cpp CLI help, including `--json-schema-file`, `--offline`, `--simple-io`, and `--single-turn`. Verify compatibility with your *pinned llama.cpp version*. Some quantized models may produce invalid plans, in which case the result is rejected without editing documents.

## Connecting this package to Office Werkstatt

- Electron main: install handlers from `electron/agent-ipc-v4.example.cjs` and create the service using **trusted settings** for `binaryPath` and `modelPath`. Never accept an arbitrary executable path from renderer IPC.
- Existing preload: merge the small `officeAgentV4` methods into the current preload (retain `contextIsolation: true`, `nodeIntegration: false`).
- Actual editor: implement `readIdentity()`, `snapshot()`, `restore()`, `execute(action)`, `onChanged()` for the active document. The V3 mock is ONLY a test stand-in. Use native editor transactions/undo where possible.
- UI: connect right-side **Ajan** to `prepare`, show proposed actions, explicitly request approval, then call `approve`. **Sohbet** mode should not modify documents.
- Repeat with dedicated Word, Excel, Slide, Note, Draw, PDF, Design and Form adapters. The validated tool list already contains initial operations for all eight modules, but only Slide mock runs are demonstrated end-to-end.

## Security rules

- Offline mode must not call external endpoints; web search is an **explicit** opt-in action through a separate trusted service, never a covert fallback.
- OpenAI provider from V2/V3 remains **optional**, and API keys must be held by Electron main/OS keychain, not the renderer.
- Every edit requires preview and explicit approval; check document revision before applying.
- Browser snippets and imported documents are untrusted inputs, not executable instructions.
- Do not offer unrestricted shell, arbitrary file access, or raw JavaScript execution as agent tools.
- Launch only a verified trusted local `llama-cli` executable and enforce model-file/path policy in production. Limit runtime, model output size, and prompt size.
- The fallback snapshot/restore is not an adequate substitute for production native editor undo history. Its document representation may not preserve selection, layout or real file metadata.

## Current limitations

- GitHub source tree was not cloneable from this container (DNS failure). No real Office Werkstatt code has been patched or built.
- The actual Slide Pro editor method names are not verified. `integration/slide-host-contract.mjs` is the bridge contract, not a verified SDK adapter.
- The CLI launches for each request (slower than a persistent in-process engine). Subsequent implementation should use Rust `llama-cpp-2` or in-process llama.cpp FFI with a persistent model context, when the repo's build system is accessible.
- No autonomous web browsing, complete multi-module document edit logic, or real PPTX/DOCX/XLSX modification tests yet.

## In Office Werkstatt (1.4.0)

This package is the reference design. In the app it runs as `public/js/agent-bridge.js` (browser port of
`core.mjs`, `transactional-agent.mjs`, `agent-workflow.mjs`, `editor-adapter.mjs`), wired to the real editors:

- **Tool registry:** the change tools of the open Werkzeug (its editor adapter, `instance.ai.tools`) plus the
  library tool `create_document`; arguments are checked against each tool's JSON schema.
- **Plan:** the model queues change tools or calls `propose_plan` (`{description, actions:[{module, tool, args}]}`,
  `$result:N.path` references); reading tools (document, library, `web_search`, `fetch_page`) run directly.
- **Preview → approval → transaction:** identity + revision check (the editor shell counts every change),
  snapshot / restore of the whole document, rollback on any failing action, one undo per plan.
- **Providers:** built-in llama.cpp (`llama-server`, persistent), Ollama, any OpenAI-compatible API.
- **Web:** `server/ai.js` – own SearXNG (optional), Bing, DuckDuckGo, Wikipedia; pages read with private
  addresses blocked.
