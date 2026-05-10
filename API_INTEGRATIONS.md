# CineTrack API Integrations

Serverless routes added under `/api`.

## TVmaze

No API key required.

- `/api/tvmaze?action=search&q=Dark`
- `/api/tvmaze?action=episodes&id=172`
- `/api/tvmaze?action=schedule&country=US&date=2026-05-10`

## AniList

No API key required for public anime metadata.

- `/api/anilist?action=search&q=Frieren`
- `/api/anilist?action=details&id=154587`
- `/api/anilist?action=airing&id=154587`

## Trakt

Public search needs a Trakt application client ID.
Account-specific watchlist/history needs OAuth and an access token.

Vercel env vars:

- `TRAKT_CLIENT_ID`
- `TRAKT_ACCESS_TOKEN` for temporary server-side testing only

Routes:

- `/api/trakt?action=search&q=Dark&type=movie,show`
- `/api/trakt?action=watchlist&type=movies,shows`
- `/api/trakt?action=history&type=movies,shows`
