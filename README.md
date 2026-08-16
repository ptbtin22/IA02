# Todo MCP Integration & Agent Host Implementation

This project implements a complete Model Context Protocol (MCP) ecosystem as defined in `mcp-assignment-spec.md`.

## 📁 System Architecture

- **`server.js`**: MCP Stdio Server providing 3 tools (`add_task`, `list_tasks`, `complete_task`), 1 resource (`todo://list`), and 1 prompt (`plan_my_day`).
- **`http.js`**: MCP Streamable HTTP Server with Express, API Key protection (`Authorization: Bearer <key>`), and a parallel REST API (`/api/tasks`).
- **`agent.js`**: Custom MCP Host Agent connecting to local/remote servers, with dynamic Skill discovery (`.skills/daily-standup/SKILL.md`) and Ollama local LLM integration (`qwen3.5:4b`).
- **`config.json`**: Server configuration specifying stdio and HTTP MCP transports.

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Stdio Server
```bash
npm run server
```

### 3. Run MCP Inspector (Local Debugging)
```bash
npm run inspector
```
Open the generated `http://localhost:6274` URL in your browser to inspect tools, resources, and prompts.

### 4. Run HTTP Server with REST API & Bearer Protection
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
  -d '{"text": "Buy milk"}'

# Mark task as completed via REST API
curl -X PATCH http://localhost:3000/api/tasks/1/complete
```

### 5. Run Agent Host (Local LLM / Skill System)
Ensure Ollama is running (`ollama run qwen3.5:4b`), then execute:
```bash
npm run agent "Standup time - what's on today?"
```

---

## 🌐 Public Deployment (e.g., Render / Fly.io / Cloudflare Workers)

Set environment variable on host provider:
```bash
MCP_KEY="<your-secret-api-key>"
```
Your public MCP endpoint will be `https://<your-app>.onrender.com/mcp`.
