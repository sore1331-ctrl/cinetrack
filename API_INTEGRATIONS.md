# CineTrack API Integrations

Serverless routes added under `/api`.

TVmaze and AniList share `/api/external` so the Vercel Hobby project stays below the 12-function limit.

## TVmaze

No API key required.

- `/api/external?provider=tvmaze&action=search&q=Dark`
- `/api/external?provider=tvmaze&action=episodes&id=172`
- `/api/external?provider=tvmaze&action=schedule&country=US&date=2026-05-10`

## AniList

No API key required for public anime metadata.

- `/api/external?provider=anilist&action=search&q=Frieren`
- `/api/external?provider=anilist&action=details&id=154587`
- `/api/external?provider=anilist&action=airing&id=154587`

## Trakt

Trakt is not currently deployed because the Vercel Hobby plan is capped at 12 serverless functions and the app is not using Trakt yet. Add it later by extending `/api/external` rather than creating another `/api` file.
