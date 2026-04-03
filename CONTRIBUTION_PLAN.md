# Contribution Plan

## Phase 1

Pick a small, high-signal security fix and get one PR merged.

### 1. Auth enforcement

Goal: mount `src/middleware/auth.ts` on the MCP routes in `src/app.ts`.

Deliverables:
- Middleware wired to `/mcp`
- Behavior verified for development vs production
- `README.md` updated to match reality

Suggested PR title:
- `Enforce MCP auth token on /mcp routes`

### 2. Secret redaction in `get_env`

Goal: make `src/tools/shell/getEnv.ts` redact secret-like keys in both bulk listing and single-key lookup.

Deliverables:
- Shared redaction helper
- Safer output
- Brief documentation note

Suggested PR title:
- `Redact sensitive env vars consistently in get_env`

## Phase 2

Do the path-safety hardening work as a focused follow-up.

### 1. Unify path validation

Goal: make git and shell tools respect `FS_ROOT` consistently.

Targets:
- `src/utils/paths.ts`
- `src/tools/git/clone.ts`
- `src/tools/shell/runCommand.ts`

Deliverables:
- One validated helper for repo and workdir paths
- Rejection of paths outside root
- Documentation aligned with implementation

Suggested PR title:
- `Harden FS_ROOT enforcement for git and shell tools`

## Phase 3

Add project-quality scaffolding so future contributions are easier.

### 1. Testing

Goal: introduce a test runner and cover the most important safety behavior first.

First targets:
- `src/middleware/auth.ts`
- `src/utils/paths.ts`
- `src/routes/mcp.ts`

Deliverables:
- `test` script
- A few core tests
- Minimal CI if needed

Suggested PR title:
- `Add baseline tests for auth, path safety, and MCP routing`

### 2. Contributor docs

Goal: make setup and contribution expectations explicit.

Deliverables:
- Fix `README.md` inconsistencies
- Add local setup, testing, and PR guidance
- Clarify security expectations for shell, network, and system tools

Suggested PR title:
- `Improve contributor setup and security documentation`

## Suggested Order

1. Auth enforcement PR
2. Env redaction PR
3. FS_ROOT hardening PR
4. Test harness PR
5. Docs and contribution guidance PR

## Why This Order

These changes are easy to explain, easy to review, and materially improve the project. That makes them strong first contributions for building trust with the maintainers.
