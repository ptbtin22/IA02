# 3 Distinct MCP Servers & Remote Agent Host Implementation

This project implements an Advanced Model Context Protocol (MCP) Ecosystem with **3 Completely Distinct Functional Servers** (eliminating tool ambiguity), Remote LLM API Integration, and an Agent Skill System.

---

## 🌐 3 Distinct Functional MCP Servers

| Server Name | Transport | Purpose | Distinct Tools & Resources |
| :--- | :--- | :--- | :--- |
| **`notes-stdio`** | Stdio (`notes-server.ts`) | **Knowledge & Notes** | Tools: `save_note`, `read_note`, `list_notes`<br>Resource: `notes://all`<br>Prompt: `review_notes` |
| **`football-http-local`** | Local HTTP (`http.ts`) | **Football Data (football-data.org)** | Tools: `get_football_competitions`, `get_competition_standings`, `get_recent_matches`<br>Resource: `football://standings`<br>Prompt: `football_summary`<br>REST API: `/api/football` |
| **`todo-http-public`** | Public Render HTTP | **Todo Task Management** | Tools: `add_task`, `list_tasks`, `complete_task`<br>Resource: `todo://list`<br>Prompt: `plan_my_day`<br>REST API: `/api/tasks` |

---

## 🚀 Getting Started

### 1. Type Check
```bash
npm run typecheck
```

### 2. Run Local Football Data HTTP Server
```bash
MCP_KEY="secret-key-123" npm run http
```

### 3. Run Agent Host (Interactive REPL Chat Mode)
```bash
npm run agent
```

---

## 🧪 Test Prompts in Agent Chat:

1. **Targeting Football Data Server (Local HTTP)**:
   ```text
   You> Show me Premier League standings
   You> What matches are playing in Champions League?
   ```

2. **Targeting Notes Server (Stdio)**:
   ```text
   You> Save a note titled 'Project Plan' with content 'Build 3 distinct MCP servers.'
   You> List my knowledge notes
   ```

3. **Targeting Todo Server (Public Render HTTP)**:
   ```text
   You> Standup time - what's on today?
   You> Add task Finish final demo
   ```
