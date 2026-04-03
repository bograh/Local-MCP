# Daily Dev Task Automation

An n8n workflow template that uses the MCP server in this repo to inspect a local codebase, generate a morning task list, and send an evening completion report.

The exported workflow has been sanitized. It does not contain plaintext API keys, bot tokens, SMTP passwords, or live personal endpoints.

## What the workflow does

There are three ways to run it:

1. A scheduled morning flow at 7:00 AM
2. A scheduled evening flow at 6:00 PM
3. A Slack app-mention trigger that lets you type `morning` or `evening` to run either flow on demand

## Current node layout

### Morning flow

1. `Morning Trigger (7:00 AM)`
2. `Git Pull via MCP`
3. `Read Codebase via MCP`
4. `Inspect Code Markers via MCP`
5. `Message a model` using Google Gemini
6. `Format Morning Notifications`
7. `Prepare Task Storage`
8. `Save Tasks to Disk via MCP`
9. `Send Morning Tasks to Slack`
10. `Send Morning Tasks Email`

### Evening flow

1. `Evening Trigger (6:00 PM)`
2. `Load Morning Tasks via MCP`
3. `Get Today Git Activity via MCP`
4. `Count Remaining TODOs via MCP`
5. `Analyze Completion (Claude AI)`
6. `Format Evening Report`
7. `Send Evening Report Email`
8. `Save Report to Disk via MCP`

### Slack-triggered flow

1. `Slack Trigger`
2. `Check Morning`
3. If the message contains `morning`, it enters the same morning chain starting at `Git Pull via MCP`
4. Otherwise it goes to `Check Evening`
5. If the message contains `evening`, it enters the same evening chain starting at `Load Morning Tasks via MCP`
6. If neither matches, `Reply to Slack` sends a fallback response

## What gets stored

The workflow writes files under `.n8n-tasks/` inside your target repository:

```text
/YOUR/PROJECT/PATH/.n8n-tasks/
  tasks_YYYY-MM-DD.json
  report_YYYY-MM-DD.json
```

The morning task file includes generated tasks plus the rendered Slack and email payloads. The evening report file stores the structured report JSON.

## Prerequisites

- n8n
- Node.js 20+
- This MCP server running locally
- A target repository on the same machine
- A Google Gemini credential for the morning model node
- An Anthropic API key for the evening analysis request
- A Slack app and credential if you want Slack delivery or Slack-triggered runs
- SMTP credentials if you want email delivery

## Setup

### 1. Start the MCP server

From the repo root:

```bash
npm install
npm run build
npm start
```

Or with Docker:

```bash
docker compose up -d --build
```

The workflow template now points MCP requests at:

```text
http://localhost:3000/mcp
```

If n8n runs in Docker, you will usually need to change that host to `http://host.docker.internal:3000/mcp`.

### 2. Import the workflow

In n8n, import `daily-dev-workflow.json`.

### 3. Replace the repository path

Search the workflow for:

```text
/YOUR/PROJECT/PATH
```

Replace every occurrence with the absolute path to the repository you want to inspect.

Those placeholders are used in:

- `git_pull`
- `search_files`
- `run_command`
- `read_file`
- `write_file`
- the morning task storage path builder
- the evening report storage path

### 4. Configure model credentials

Configure these nodes before activating the workflow:

- `Message a model`: attach your Google Gemini credential
- `Analyze Completion (Claude AI)`: set the Anthropic API key used by the `x-api-key` header expression, or change the node to use your preferred auth setup

By default, the morning flow uses `models/gemini-2.5-flash` and the evening flow posts to `https://api.anthropic.com/v1/messages` with model `claude-opus-4-5`.

### 5. Configure Slack and email nodes

Update these placeholders:

- Slack channel IDs: `YOUR_SLACK_CHANNEL_ID`
- Email addresses: `automation@example.com` and `you@example.com`
- Slack credentials marked `Configure Slack credential`
- SMTP credentials marked `Configure SMTP credential`

The Slack app-mention trigger also needs to be connected to your Slack workspace before manual runs will work.

### 6. Activate the workflow

Once the paths, credentials, and notification targets are set, activate the workflow in n8n.

## MCP usage

The workflow uses the MCP server for all local git and filesystem access.

Morning flow:

- `git_pull`
- `search_files`
- `run_command`
- `write_file`

Evening flow:

- `read_file`
- `run_command`
- `write_file`

## Morning output schema

The morning model is expected to return JSON in this shape:

```json
{
  "date": "2026-04-03",
  "summary": "One sentence project status",
  "tasks": [
    {
      "id": "T001",
      "priority": "high",
      "category": "bugfix",
      "title": "Short task title",
      "description": "Two or three sentence description.",
      "file_hints": ["src/file.ts"],
      "estimated_minutes": 45
    }
  ]
}
```

Allowed values:

- `priority`: `high`, `medium`, `low`
- `category`: `bugfix`, `feature`, `refactor`, `test`, `docs`, `chore`

## Evening report schema

The evening model is expected to return JSON in this shape:

```json
{
  "date": "2026-04-03",
  "overall_completion": 75,
  "productivity_score": "B",
  "executive_summary": "Short summary of the day.",
  "tasks": [
    {
      "id": "T001",
      "title": "Short task title",
      "status": "completed",
      "evidence": "Git or code evidence supporting the status.",
      "completion_pct": 100
    }
  ],
  "unplanned_work": [
    { "description": "Investigated a production issue", "impact": "positive" }
  ],
  "blockers": ["Waiting on external input"],
  "tomorrow_suggestions": ["Finish remaining tests"],
  "metrics": {
    "commits_today": 3,
    "files_changed": 12,
    "todos_resolved": 2
  }
}
```

Allowed values:

- `productivity_score`: `A`, `B`, `C`, `D`
- `status`: `completed`, `partial`, `not_started`
- `impact`: `positive`, `neutral`, `negative`

## Sanitization notes

The checked-in workflow template has been scrubbed of environment-specific values that should not be published:

- The MCP base URL now uses `http://localhost:3000/mcp`
- Repository paths now use `/YOUR/PROJECT/PATH`
- Slack channel IDs are placeholders
- Email recipients and senders are placeholders
- Exported n8n credential IDs and instance metadata are placeholders

I did not find any plaintext API secret, bearer token, SMTP password, or private key in the workflow export.

## Troubleshooting

`MCP requests fail`

- Confirm the MCP server is reachable at `/health`
- If n8n is containerized, switch `localhost` to `host.docker.internal`

`Morning tasks are empty`

- Check the output from `Message a model`
- The downstream Code node tries to recover JSON from fenced or noisy model output, but invalid responses can still collapse to an empty task list

`Evening analysis fails`

- Check the Anthropic request node headers and model settings
- Verify the morning task file exists for the current date under `.n8n-tasks/`

`Slack app mentions do nothing`

- Confirm the Slack trigger is connected to the correct workspace and channel
- Make sure the app has permission to receive mentions in that channel

## License

MIT
