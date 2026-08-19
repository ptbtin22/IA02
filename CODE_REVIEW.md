# Code Review — IA02 Multi-Transport MCP Server Ecosystem & Agent Host

Reviewed the whole tree; the important findings were verified by running the code.

Notes on the review environment:

- `npm install` was run, so `node_modules/` is now present in the working tree.
- `npx tsc --noEmit` passes with **zero errors**.
- Secret values are redacted throughout this document. Where a finding concerns a
  specific credential, see the referenced file for the value — it is deliberately
  not reproduced here.

---

## Critical — secrets

### 1. `submission.txt` publishes the live bearer token for the public endpoint

`submission.txt` pairs `https://todo-mcp-http.onrender.com/mcp` with the production
`MCP_KEY` value in plaintext, and the file is **not** listed in `.gitignore` — unlike
`.env`. The README points at a public GitHub repo, so this is a credential to a live
internet-facing service sitting in version control. The token is also short and
guessable on its own.

**Fix**

- Rotate `MCP_KEY` in the Render dashboard to a high-entropy value
  (e.g. `openssl rand -hex 32`).
- Remove the token from `submission.txt`; hand it to the grader out-of-band.
- Add `submission.txt` to `.gitignore`.
- If the file was ever pushed, it is in the git history too — rotation is the only
  real remediation.

### 2. `.env` holds a real LLM API key

`.env` is correctly gitignored, but since `MCP_KEY` leaked through `submission.txt`,
treat `LLM_API_KEY` as suspect and rotate it as well.

### 3. `render-server.ts:43` prints the auth key to stdout on every boot

The startup banner logs the active key straight into Render's log stream, where anyone
with dashboard read access can see it. Reproduced locally — the banner emitted the
full 64-character key.

**Fix:** drop the line, or print only a fingerprint such as
`sha256(key).slice(0, 8)`.

> The README's "🔒 Security Best Practices → Zero Hardcoded Secrets" claim is
> contradicted by findings 1 and 3.

---

## High — the public server can run unauthenticated

`render-server.ts:13-15` gates the auth middleware behind `if (process.env.MCP_KEY)`.
That fails **open**: no key configured means no auth guard at all, on a public MCP
endpoint. `render.yaml` sets `sync: false` for `MCP_KEY`, so a fresh deploy that
forgets to set it is wide open by default.

Compounding it, `render-server.ts` never calls `process.loadEnvFile(".env")` — only
`agent.ts:2` does. So locally, `npm start` has **no authentication whatsoever**, even
with `MCP_KEY` set in `.env`. Verified — an unauthenticated `tools/list` succeeded:

```console
$ curl -s -X POST http://localhost:4123/mcp \
    -H 'Content-Type: application/json' \
    -H 'Accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
event: message
data: {"result":{"tools":[{"name":"add_task", ...
```

**Fix:** load `.env` in the server entry points too, and fail closed — exit at startup
if `MCP_KEY` is missing, rather than silently disabling the guard.

The same missing-`loadEnvFile` bug hits `src/servers/football.ts:8`:
`FOOTBALL_API_KEY` is read at module load, but `football-http-local.ts` never loads
`.env`, so `npm run http` **always** serves mock data from `src/football-mock-data.ts`
regardless of the key configured.

---

## High — the local-tools sandbox does not sandbox

`src/local-tools.ts:23-29`:

```js
const resolved = path.resolve(".", targetPath);
if (!resolved.startsWith(WORKSPACE_DIR) && !resolved.startsWith(path.resolve("."))) {
  throw new Error(`Access denied: ...`);
}
```

`safePath()` is ineffective in two independent ways, both verified:

1. The second clause admits **anything under the project root**, so `WORKSPACE_DIR` is
   decorative. `read_file({path: ".env"})` returned the credentials file (314 bytes,
   beginning `# MCP Server Auth Key`). An LLM — or prompt injection arriving through any
   MCP tool result — can read the project's secrets and write files anywhere in the repo.
2. `startsWith` compares strings with no separator check, so the project root can be
   escaped entirely. `list_files({path: "../IA02-main-sibling"})` returned
   `[FILE] OUTSIDE.txt` from outside the project.

**Fix:** resolve against `WORKSPACE_DIR` rather than `.`, then check
`resolved === WORKSPACE_DIR || resolved.startsWith(WORKSPACE_DIR + path.sep)`.

### The confirmation prompts are skipped in single-query mode

`agent.ts:189` calls `runQueryLoop(...)` without passing `rl`, and both guards in
`local-tools.ts` are wrapped in `if (rl)` (lines 189 and 204). So
`npm run agent "..."` executes `run_command` and `delete_file` with **no approval at
all**. Verified:

```
run_command(no rl) -> NO_CONFIRMATION_REQUIRED
```

That is the opposite of fail-safe. A missing `rl` should **deny** the operation.
`execSync` also runs a model-supplied string through a shell, so treat the approval
prompt as the only barrier and make it unskippable.

---

## Medium

**Timing-unsafe token comparison.** `src/middleware/auth.ts:12` uses `token !== KEY`.
Use `crypto.timingSafeEqual` over equal-length digests. Also `.replace("Bearer ", "")`
is unanchored and case-sensitive — parse the auth scheme properly.

**No DNS-rebinding protection on the local HTTP server.** `football-http-local.ts`
binds `localhost:3000` with no `Origin` validation, so any web page the user visits can
reach it. The MCP SDK docs call this out specifically for local HTTP transports.

**One shared server instance re-`connect()`ed per request.** Both `render-server.ts:27`
and `football-http-local.ts:21` call `server.connect(newTransport)` on every POST. Each
`connect()` overwrites the server's transport reference and its `onclose` handler, and
any single request finishing fires the shared server's close path. Eight concurrent
`add_task` calls all returned correctly, so **no failure was reproduced** — but the
pattern is a race by construction and diverges from the SDK's stateless recipe, which
builds a **new server per request**. Since task state already lives in the module-level
`src/tasks-store.ts`, a fresh server per request costs nothing.

**Pruning can produce API-rejecting message arrays.** `src/session.ts:50-57` slices by
count, so a `role: "tool"` message can survive while the assistant message carrying its
`tool_calls` is dropped. OpenAI-compatible endpoints reject that with a 400 — and
`src/llm.ts:44-48` swallows the error and silently switches to the mock engine, so the
symptom is fabricated output rather than a diagnosable failure. Prune at
tool-call-group boundaries.

**Unhandled MCP tool errors kill the session.** `agent.ts:87` awaits
`client.callTool(...)` with no try/catch, unlike the local-tool branch at line 79. One
server-side error propagates to `main().catch` and `process.exit(1)`, dropping the
entire interactive REPL. Wrap it and feed the error back as the tool result. Related:
`isError: true` results (e.g. `src/servers/todo.ts:55`) are passed to the model as
ordinary success text.

**Silent fallback to fabricated data.** `mockAgentDecision` returns confident,
hardcoded content — "Arsenal & Liverpool level on 64 points", a full Saigon packing
advisory — with no marker that the LLM was unreachable. A user cannot distinguish real
output from canned. Prefix fallback responses with something like `[OFFLINE MOCK]`.

**Tool names collide silently.** `src/mcp-loader.ts:91` keys `clientsMap` by tool name
across all servers; last writer wins. Two servers exporting `list_tasks` means one is
silently shadowed. Namespace as `server__tool`.

---

## Low

- **Empty-string env interpolation.** `src/mcp-loader.ts:18` substitutes `""` for a
  missing variable, sending a bare `Authorization: Bearer ` and producing a confusing
  401. Warn on unresolved placeholders.
- **Fragile auto-spawn.** `src/mcp-loader.ts:67-72` uses `stdio: "ignore"` plus a fixed
  1500 ms sleep, and `detached` + `unref()` leaves an orphan process holding port 3000
  after the agent exits. Poll `/health` instead of sleeping, and log spawn failures.
- **Port collision.** `render-server.ts` and `football-http-local.ts` both default to
  port 3000, so `npm start` and `npm run http` conflict locally.
- **Fragile task ids.** `src/tasks-store.ts:19` uses `tasks.length + 1` — a latent
  duplicate-id bug the moment deletion exists. Use a monotonic counter.
- **Task state is in-memory only.** Render's free plan spins down, so tasks vanish
  between sessions.
- **Dead import / unmet README promise.** `printServerStatus` is imported at
  `agent.ts:17` but never called, so the README's "green connection badges for all 3
  MCP servers" never render; `mcp-loader` prints plain `console.error` lines instead.
- **Silent turn-limit exhaustion.** The `MAX_TURNS = 15` loop at `agent.ts:43` exits
  with no message to the user.
- **README `file:///` links.** Absolute `file:///Users/tinpham/MyCode/Projects/todo-mcp/...`
  links are broken for everyone else and leak the author's local directory layout. Use
  relative paths. The quickstart also says `git clone .../IA02.git && cd todo-mcp`,
  where the clone produces `IA02/`.
- **Misleading resource descriptions.** "Live weather report feed" and "Live Premier
  League standings" describe entirely hardcoded data.
- **Narrow `tsconfig` include.** `"include": ["*.ts"]` only seeds root files; `src/**`
  is checked transitively via imports today, but adding `"src/**/*.ts"` makes that
  robust.
- **No tests, lint, or CI.**

---

## What's good

The structure is genuinely clean:

- Server definitions are factored into pure factories under `src/servers/` and shared
  by both transports.
- The three transport styles are a real demonstration rather than three copies of one
  thing.
- `types.ts` is well-organized with no `any`, and the strict-mode typecheck passes with
  zero errors.
- Skills are properly frontmattered and loaded as a cheap startup index.
- The offline mock-data fallback is a smart demo affordance — it just needs to announce
  itself.

---

## Suggested fix order

| # | Finding | File |
| :--- | :--- | :--- |
| 1 | Rotate + remove leaked bearer token, gitignore the file | `submission.txt`, `.gitignore` |
| 2 | Stop logging the auth key | `render-server.ts:43` |
| 3 | Fail closed on missing `MCP_KEY`; load `.env` in server entry points | `render-server.ts:13-15` |
| 4 | Make missing `rl` deny instead of auto-approve | `src/local-tools.ts:189,204` |
| 5 | Repair `safePath()` prefix + root checks | `src/local-tools.ts:23-29` |
| 6 | Constant-time token comparison | `src/middleware/auth.ts:12` |
| 7 | New server instance per request | `render-server.ts:27`, `football-http-local.ts:21` |
| 8 | Prune at tool-call-group boundaries | `src/session.ts:50-57` |
| 9 | try/catch around `client.callTool` | `agent.ts:87` |
| 10 | Label offline mock responses | `src/llm.ts` |
