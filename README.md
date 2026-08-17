# 3 Distinct MCP Servers & Remote Agent Host Implementation

This project implements an Advanced Model Context Protocol (MCP) Ecosystem with **3 Completely Distinct Functional Servers** (eliminating tool ambiguity), Remote LLM API Integration, and an Agent Skill System.

---

## 🌐 3 Distinct Functional MCP Servers

| Server Name | Transport | Purpose | Distinct Tools & Resources |
| :--- | :--- | :--- | :--- |
| **`notes-stdio`** | Stdio (`notes-server.ts`) | **Knowledge & Notes** | Tools: `save_note`, `read_note`, `list_notes`<br>Resource: `notes://all`<br>Prompt: `review_notes` |
| **`system-http-local`** | Local HTTP (`http.ts`) | **System Metrics & Utilities** | Tools: `get_system_info`, `calculate_expression`, `convert_currency`<br>Resource: `system://info`<br>Prompt: `system_audit`<br>REST API: `/api/system` |
| **`todo-http-public`** | Public Render HTTP | **Todo Task Management** | Tools: `add_task`, `list_tasks`, `complete_task`<br>Resource: `todo://list`<br>Prompt: `plan_my_day`<br>REST API: `/api/tasks` |

---

## 🤖 Remote LLM Connection Setup

Set Remote OpenAI-compatible API credentials in your environment:
```bash
export OPENAI_API_KEY="sk-your-remote-api-key"
export OPENAI_BASE_URL="https://api.openai.com/v1" # or OpenRouter / custom remote provider
export OPENAI_MODEL="gpt-4o-mini"
```

---

## 🚀 Getting Started

### 1. Type Check
```bash
npm run typecheck
```

### 2. Run Local System Utility HTTP Server
```bash
MCP_KEY="secret-key-123" npm run http
```

### 3. Run Agent Host (Interactive REPL Chat Mode)
```bash
npm run agent
```

---

## 🧪 Test Prompts in Agent Chat:

1. **Targeting Notes Server (Stdio)**:
   ```text
   You> Save a note titled 'Project Plan' with content 'Build 3 distinct MCP servers.'
   You> List my knowledge notes
   ```

2. **Targeting System Utility Server (Local HTTP)**:
   ```text
   You> Calculate 15 * 84 + 10
   You> Convert 100 USD to VND
   ```

3. **Targeting Todo Server (Public Render HTTP)**:
   ```text
   You> Standup time - what's on today?
   You> Add task Finish final demo
   ```
