# Chat Server Consolidation Plan

- Current State
  - apps/chat-server (source of truth; has Dockerfile, keys/)
  - chat-server/ (duplicate legacy; contains dist/ and scripts)

- Plan (non-breaking)
  1. Canonicalize to apps/chat-server.
  2. Keep chat-server/ for now (no deletions).
  3. Provide docker-compose.chat.yml to run the canonical server.
  4. Migrate any missing scripts from legacy to apps/chat-server as needed.
  5. Later: archive/remove legacy after verification.

- Run Locally
```bash
cd project2-pxlgiftcard
docker compose -f docker-compose.chat.yml up --build -d
```

- Env & Secrets
  - Service account injected via Docker secret: apps/chat-server/keys/pxl-perfect-1-service-account.json
  - Exposes port 8080

- Next Steps
  - Add CI build for apps/chat-server image
  - Remove legacy chat-server/ after 1 week of stable use
