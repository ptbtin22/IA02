# Model Context Protocol (MCP) Integration & Agent Host Implementation

> Complete TypeScript implementation of an MCP Stdio Server, Streamable HTTP Server with Bearer API Key Protection & Parallel REST API, Agent Skill System (`.skills/`), and custom Agent Host connecting to local LLM (`qwen3.5:4b` via Ollama).

---

## 🌐 Live Deployed Server Details (Render)

- **Live MCP Endpoint**: `https://todo-mcp-http.onrender.com/mcp`
- **Live REST Endpoint**: `https://todo-mcp-http.onrender.com/api/tasks`
- **Live Health Check**: `https://todo-mcp-http.onrender.com/health`
- **API Access Key (`MCP_KEY`)**: `secret-key-123`

---

## 📁 System Architecture (TypeScript)

- **`server.ts`**: MCP Stdio Server exposing 3 tools (`add_task`, `list_tasks`, `complete_task`), 1 resource (`todo://list`), and 1 prompt (`plan_my_day`).
- **`http.ts`**: MCP Streamable HTTP Server with Express, API Key protection (`Authorization: Bearer <key>`), and parallel REST API (`/api/tasks`).
- **`agent.ts`**: Custom MCP Host Agent connecting to stdio/HTTP servers, with dynamic Skill discovery (`.skills/daily-standup/SKILL.md`) and Ollama local LLM integration (`qwen3.5:4b`).
- **`src/`**: Clean modular software architecture (`types.ts`, `tasks-store.ts`, `todo-server.ts`, `auth.ts`, `rest.ts`, `skills.ts`, `mcp-loader.ts`, `llm.ts`).
- **`config.json`**: Configuration specifying local stdio, local HTTP, and public Render HTTP servers.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Type Check
```bash
npm run typecheck
```

### 3. Run Stdio Server
```bash
npm run server
```

### 4. Run MCP Inspector (Local Debugging)
```bash
npm run inspector
```
Open `http://localhost:6274` in your browser to inspect tools, resources, and prompts.

### 5. Run HTTP Server with REST API & Bearer Protection
```bash
MCP_KEY="secret-key-123" npm run http
```
- **MCP Endpoint**: `http://localhost:3000/mcp` (Requires `Authorization: Bearer secret-key-123`)
- **REST API**: `http://localhost:3000/api/tasks`

#### Test REST API & Auth via `curl`:
```bash
# Test 401 Unauthorized on /mcp without Bearer token
curl -i http://localhost:3000/mcp

# Query tasks via REST API
curl http://localhost:3000/api/tasks

# Add task via REST API
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Build MCP Agent Host"}'

# Mark task as completed via REST API
curl -X PATCH http://localhost:3000/api/tasks/1/complete
```

### 6. Run Agent Host (Local LLM / Skill System)
Ensure Ollama is running (`ollama run qwen3.5:4b`), then execute:
```bash
npm run agent "Standup time - what's on today?"
```
