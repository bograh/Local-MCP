# Daily Dev Task Automation

An n8n workflow that inspects your codebase every morning, generates a prioritised task list using an LLM of your choice, and sends you an end-of-day completion report, driven by the MCP server in this repo.

---

## How it works

Two scheduled flows run automatically each day.

**Morning (7:00 AM)**

1. Runs `git pull` on your project directory
2. Lists matching source files and scans for `TODO`, `FIXME`, `HACK`, and `BUG` markers
3. Collects recent commits from the git log
4. Sends all of that context to the configured LLM, which returns a structured list of 5–8 actionable tasks (with priority, category, estimated time, and relevant file hints)
5. Saves the task list to `.n8n-tasks/tasks_YYYY-MM-DD.json` in your project
6. Delivers the tasks to **Slack** (rich block message) and **Email** (styled HTML)

**Evening (6:00 PM)**

1. Loads this morning's saved task file
2. Fetches today's commit log with per-commit file stats
3. Counts remaining TODO markers in the codebase
4. Sends everything to the LLM, which compares each task against the git evidence and assesses it as `completed`, `partial`, or `not_started`
5. Sends a **report email** with a productivity score (A–D), per-task breakdown, metrics, blockers, and suggestions for tomorrow
6. Archives the report to `.n8n-tasks/report_YYYY-MM-DD.json`

---

## Prerequisites

- [n8n](https://n8n.io) (self-hosted or cloud)
- Node.js 20+
- This local MCP server (see setup below)
- An API key for your chosen LLM provider (the workflow ships pre-configured for Anthropic; see [Switching LLM providers](#switching-llm-providers))
- A Slack workspace with a bot token
- SMTP credentials for sending email

---

## Setup

### 1. Start the MCP server

The workflow communicates with your filesystem and git through this repo's MCP server on `localhost:3000` by default.

```bash
npm install
npm run build
npm start
```

Docker works too:

```bash
docker compose up -d --build
```

The workflow uses these MCP tools from this server:

- `git_pull`
- `search_files`
- `run_command`
- `read_file`
- `write_file`

Keep the server running while n8n is active. A process manager like `pm2` works well:

```bash
pm2 start "npm start" --name local-mcp
```

### 2. Import the workflow

In n8n, go to **Workflows → Import from file** and select `daily-dev-workflow.json`.

### 3. Replace the project path

Search the imported workflow for `/YOUR/PROJECT/PATH` and replace every occurrence with your actual repository path. There are 7 occurrences across the MCP HTTP Request nodes.

You can do this in the n8n UI by opening each HTTP Request node and editing the `params` body, or by doing a find-and-replace in the JSON before importing.

### 4. Configure credentials

Open each node that requires a credential and connect the appropriate account.

| Node | Credential type | What to configure |
|---|---|---|
| Generate Tasks (LLM) | HTTP Header Auth | Your LLM provider API key (see below) |
| Analyze Completion (LLM) | HTTP Header Auth | Same API key |
| Send Morning Tasks to Slack | Slack OAuth2 | Your Slack bot token |
| Send Morning Tasks Email | SMTP | Host, port, username, password |
| Send Evening Report Email | SMTP | Same SMTP account |

### 5. Update notification targets

In the **Slack** node, change the `channel` field from `#dev-daily` to your preferred channel.

In both **Email** nodes, update `fromEmail` and `toEmail` to your actual addresses.

### 6. Activate the workflow

Toggle the workflow to **Active** in n8n. It will fire automatically at 7:00 AM and 6:00 PM in the timezone configured on your n8n instance.

---

## File structure

The workflow creates and reads files inside a `.n8n-tasks/` directory at the root of your project:

```
your-project/
└── .n8n-tasks/
    ├── tasks_2026-04-02.json       # morning task list
    ├── report_2026-04-02.json      # evening completion report
    ├── tasks_2026-04-03.json
    └── report_2026-04-03.json
```

Add `.n8n-tasks/` to your `.gitignore` if you don't want these committed.

---

## Task list schema

The LLM returns tasks in this structure each morning:

```json
{
  "date": "2026-04-02",
  "summary": "One sentence project status",
  "tasks": [
    {
      "id": "T001",
      "priority": "high",
      "category": "bugfix",
      "title": "Fix auth token refresh race condition",
      "description": "The refresh logic in authService.ts has a race condition when two requests fire simultaneously. Needs a mutex or request deduplication.",
      "file_hints": ["src/services/authService.ts", "src/hooks/useAuth.ts"],
      "estimated_minutes": 45
    }
  ]
}
```

Valid values for `priority`: `high`, `medium`, `low`  
Valid values for `category`: `bugfix`, `feature`, `refactor`, `test`, `docs`, `chore`

---

## Evening report schema

```json
{
  "date": "2026-04-02",
  "overall_completion": 75,
  "productivity_score": "B",
  "executive_summary": "Strong day — 4 of 6 tasks completed with solid commit coverage.",
  "tasks": [
    {
      "id": "T001",
      "title": "Fix auth token refresh race condition",
      "status": "completed",
      "evidence": "Commit a3f9c12 modified authService.ts with mutex implementation",
      "completion_pct": 100
    }
  ],
  "unplanned_work": [
    { "description": "Investigated flaky CI test in pipeline", "impact": "positive" }
  ],
  "blockers": ["Waiting on API credentials from third-party vendor"],
  "tomorrow_suggestions": ["Complete the remaining test coverage for authService"],
  "metrics": {
    "commits_today": 5,
    "files_changed": 12,
    "todos_resolved": 3
  }
}
```

---

## Customisation

**Change the trigger times** — open the Schedule Trigger nodes and adjust `triggerAtHour` and `triggerAtMinute`.

**Switch LLM provider or model** — see [Switching LLM providers](#switching-llm-providers) below.

**Adjust how many tasks are generated** — edit the system prompt in the "Generate Tasks" node. The default asks for 5–8 tasks; increase or decrease this number to match your typical day.

**Scope the file scan** — the `search_files` call uses the glob `**/*.{ts,tsx,js,jsx,py,go,rs,java,cs,rb,md,json,yaml,yml,toml}`. Adjust that pattern to match your stack.

**Add more code marker types** — the grep pattern in "Inspect Code Markers" scans for `TODO`, `FIXME`, `HACK`, `XXX`, and `BUG`. Extend the pattern to catch your team's conventions.

---

## Troubleshooting

**MCP nodes return connection errors** — confirm the MCP server is running on port 3000 with `curl http://localhost:3000/health`. If you're running n8n in Docker, replace `localhost` with `host.docker.internal`.

**LLM returns malformed JSON** — both AI nodes include a JSON extraction fallback in the Code nodes that strips markdown fences and extracts the first `{...}` block. If parsing still fails, check the raw response in the n8n execution log and tighten the system prompt.

**Evening flow can't find the morning task file** — ensure both n8n and the MCP server are running with permission to read and write the `.n8n-tasks/` directory. The file path uses today's date in `YYYY-MM-DD` format based on the server's local timezone — make sure n8n's timezone setting matches.

**Slack message not appearing** — confirm your Slack bot has been invited to the target channel (`/invite @your-bot-name`).

---

## Architecture

```
7:00 AM Schedule
  └─ Git Pull (MCP)
       └─ Read Directory (MCP)
            └─ Inspect Code Markers (MCP)
                 └─ Generate Tasks (LLM)
                      └─ Format Notifications
                           └─ Save Tasks (MCP)
                                ├─ Slack message
                                └─ Email

6:00 PM Schedule
  └─ Load Morning Tasks (MCP)
       └─ Get Git Activity (MCP)
            └─ Count TODOs (MCP)
                 └─ Analyze Completion (LLM)
                      └─ Format Report
                           ├─ Report Email
                           └─ Save Report (MCP)
```

All filesystem and git operations are proxied through the local MCP server via JSON-RPC over HTTP.

---

## Switching LLM providers

The two HTTP Request nodes that call the LLM ("Generate Tasks" and "Analyze Completion") are plain `POST` requests — swap the URL, auth header, and body to use any provider.

**Anthropic (default)**
```
URL:    https://api.anthropic.com/v1/messages
Header: x-api-key: <your key>
        anthropic-version: 2023-06-01
Body:   { "model": "claude-opus-4-6", "max_tokens": 2000, "messages": [...] }
```

**OpenAI / OpenAI-compatible**
```
URL:    https://api.openai.com/v1/chat/completions
Header: Authorization: Bearer <your key>
Body:   { "model": "gpt-4o", "messages": [{ "role": "system", ... }, { "role": "user", ... }] }
```
Adjust the response extraction in the downstream Code nodes: OpenAI returns `data.choices[0].message.content` instead of `data.content[0].text`.

**Ollama (local)**
```
URL:    http://localhost:11434/api/chat
Header: (none required)
Body:   { "model": "llama3", "stream": false, "messages": [...] }
```
Response path: `data.message.content`.

**Google Gemini**
```
URL:    https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=<your key>
Header: Content-Type: application/json
Body:   { "contents": [{ "parts": [{ "text": "..." }] }] }
```
Response path: `data.candidates[0].content.parts[0].text`.

For any provider, the two system prompts (in the `system` field or first `messages` entry) can stay exactly as-is — they instruct the model to return strict JSON, which works regardless of the underlying model.

---

## License

MIT
