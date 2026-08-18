# IA02 — Multi-Transport MCP Server Ecosystem & Agent Host

An end-to-end, multi-transport **Model Context Protocol (MCP)** system featuring **3 distinct MCP Servers** (Stdio, Local HTTP, Cloud HTTP), procedural **Agent Skills**, interactive **Local File/Command Tools**, session persistence, and a high-contrast **CLI Agent Host**.

🎥 **Watch YouTube Demo Video**: [https://youtu.be/UKLkTBR9wqo](https://youtu.be/UKLkTBR9wqo)

[![Watch the Demo Video](https://img.youtube.com/vi/UKLkTBR9wqo/maxresdefault.jpg)](https://youtu.be/UKLkTBR9wqo)

---

## 🏛️ System Architecture

```
                                  ┌──────────────────────────────────────────────┐
                                  │      FIT HCMUS LLM / Remote LLM Provider    │
                                  └──────────────────────┬───────────────────────┘
                                                         │ OpenAI JSON Chat API
                                                         ▼
                                  ┌──────────────────────────────────────────────┐
                                  │           AGENT HOST (agent.ts)              │
                                  │    - Session Persistence (session.json)      │
                                  │    - IA01 Local File & Command Execution     │
                                  │    - High-Contrast Terminal UI (cli-ui.ts)   │
                                  └──────┬───────────────┬───────────────┬───────┘
                                         │               │               │
                     Stdio Child Process │               │ HTTP          │ HTTP (Bearer Auth)
                                         ▼               ▼               ▼
┌──────────────────────────────────────────┐ ┌───────────────────────────┐ ┌─────────────────────────────────────────┐
│     weather-stdio (weather-server.ts)    │ │    football-http-local   │ │    todo-http-public (render-server.ts)  │
│  - Standard I/O Process Transport        │ │  - Local Express Server   │ │  - Live Public Cloud Server on Render   │
│  - Weather & Forecast Data               │ │  - Port 3000 /mcp        │ │  - https://todo-mcp-http.onrender.com   │
└──────────────────────────────────────────┘ └───────────────────────────┘ └─────────────────────────────────────────┘
```

---

## 🌐 3 Distinct MCP Servers

| Server Name | Transport Protocol | Entry Point | Tools | Resources | Prompts |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`weather-stdio`** | **Stdio** (`child_process`) | [`weather-server.ts`](file:///Users/tinpham/MyCode/Projects/todo-mcp/weather-server.ts) | `get_current_weather`, `get_weather_forecast`, `get_air_quality` | `weather://current` | `weather_report` |
| **`football-http-local`** | **Local HTTP** (`http://localhost:3000/mcp`) | [`football-http-local.ts`](file:///Users/tinpham/MyCode/Projects/todo-mcp/football-http-local.ts) | `get_football_competitions`, `get_competition_standings`, `get_recent_matches` | `football://standings` | `football_summary` |
| **`todo-http-public`** | **Public HTTP** (`https://todo-mcp-http.onrender.com/mcp`) | [`render-server.ts`](file:///Users/tinpham/MyCode/Projects/todo-mcp/render-server.ts) | `add_task`, `list_tasks`, `complete_task` | `todo://list` | `plan_my_day` |

---

## 📚 Agent Skills Ecosystem

Located under `.skills/`, procedural skill guides instruct the agent to execute structured multi-step workflows:

1. 📋 **`daily-standup`** ([`.skills/daily-standup/SKILL.md`](file:///Users/tinpham/MyCode/Projects/todo-mcp/.skills/daily-standup/SKILL.md)): Calls `list_tasks` on `todo-http-public` to format morning standup reports.
2. ⚽ **`matchday-briefing`** ([`.skills/matchday-briefing/SKILL.md`](file:///Users/tinpham/MyCode/Projects/todo-mcp/.skills/matchday-briefing/SKILL.md)): Calls `get_competition_standings` and `get_recent_matches` on `football-http-local` to analyze title races and match fixtures.
3. 🌤️ **`travel-weather-planner`** ([`.skills/travel-weather-planner/SKILL.md`](file:///Users/tinpham/MyCode/Projects/todo-mcp/.skills/travel-weather-planner/SKILL.md)): Calls `get_current_weather`, `get_weather_forecast`, and `get_air_quality` on `weather-stdio` to generate travel weather advisories and packing checklists.

---

## 📂 Modular Directory Structure

```text
todo-mcp/
├── weather-server.ts         # Weather Stdio Server Entry Point
├── football-http-local.ts    # Football Local HTTP Server Entry Point (Port 3000)
├── render-server.ts         # Todo Public Cloud HTTP Server Entry Point (Render)
├── agent.ts                 # CLI Agent Host Entry Point
├── config.json              # MCP Transport Configuration file
├── .env.example             # Template file with placeholder credentials
├── .skills/                 # Procedural Agent Skill Instructions
│   ├── daily-standup/
│   ├── matchday-briefing/
│   └── travel-weather-planner/
└── src/
    ├── servers/             # Pure MCP Server Definitions
    │   ├── weather.ts       # Weather Server definition (Tools, Resources, Prompts)
    │   ├── football.ts      # Football Server definition (Tools, Resources, Prompts)
    │   └── todo.ts          # Todo Server definition (Tools, Resources, Prompts)
    ├── cli-ui.ts            # High-Contrast Terminal UI components & ANSI styles
    ├── mcp-loader.ts        # Dynamic MCP Transport loader with auto-spawn fallback
    ├── local-tools.ts       # IA01 Local File/Command tools with human approval prompts
    ├── session.ts           # Session persistence (session.json) & message pruning
    └── llm.ts               # FIT HCMUS Remote LLM client & Mock fallback executor
```

---

## ⚡ Quickstart & Usage

### 1. Installation & Environment Setup
Clone the repository and copy the environment template:
```bash
git clone https://github.com/ptbtin22/IA02.git
cd todo-mcp
npm install
cp .env.example .env
```

Configure your credentials in `.env` (git-ignored):
```env
LLM_BASE_URL=https://ai-fit.hcmus.edu.vn/openai
LLM_API_KEY=your_fit_llm_api_key
LLM_MODEL=Qwen3.6-27B
MCP_KEY=your_public_mcp_bearer_token
```

### 2. Running the Agent (One-Command Experience)
Launch the interactive CLI Agent Chat:
```bash
npm run agent
```
> **Smart Auto-Spawn Feature**: If `football-http-local` is not pre-started, `loadMcpClients()` will automatically launch `football-http-local.ts` in the background, connect seamlessly, and display green connection badges for all 3 MCP servers!

### 3. Optional: Running Individual Servers
* **Run Local Football Server**:
  ```bash
  npm run http
  ```
  * MCP Endpoint: `POST http://localhost:3000/mcp`
  * Health Check: `GET http://localhost:3000/health`

* **Run Stdio Weather Server**:
  ```bash
  npm run weather
  ```

* **Run Production Render Server**:
  ```bash
  npm start
  ```

* **TypeScript Type Checking**:
  ```bash
  npm run typecheck
  ```

---

## 🔒 Security Best Practices
- **Zero Hardcoded Secrets**: All sensitive keys are strictly loaded via `process.env` / `process.loadEnvFile(".env")`.
- **Public Template Safeguard**: `.env.example` contains non-functional placeholder strings only.
- **Dangerous Command Guard**: Local shell command tool (`run_command`) prompts for explicit user approval `(y/N)` before execution.
