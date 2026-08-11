# NotebookLM API Integration

This project now includes a NotebookLM integration surface in the backend.

## Routes

- `GET /api/notebooklm/status`
- `GET /api/notebooklm/notebooks`
- `POST /api/notebooklm/notebooks`
- `POST /api/notebooklm/notebooks/:notebookId/sources`

## Environment

- `NOTEBOOKLM_API_BASE_URL`
- `GOOGLE_CLOUD_ACCESS_TOKEN`
- `NOTEBOOKLM_ACCESS_TOKEN` as optional fallback

## Notes

- The backend expects a Google Cloud bearer token for NotebookLM Enterprise API access.
- Keep the base URL configurable because the exact Discovery Engine path depends on your Google Cloud project and deployment.
- Use short-lived access tokens where possible instead of hardcoded long-lived credentials.

## Suggested usage

1. Obtain a valid Google Cloud access token for the NotebookLM Enterprise API.
2. Set `NOTEBOOKLM_API_BASE_URL` and `GOOGLE_CLOUD_ACCESS_TOKEN`.
3. Call `GET /api/notebooklm/status` first.
4. Create a notebook, then attach source material from HyperAI outputs or curated documents.
