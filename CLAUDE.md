# CineTrack — working notes

## Deployed build is the source of truth, not your local clone

The live Vercel deployment is what the user sees. Your local clone is a
snapshot that may be stale, and `main` is not necessarily what is running.
Branches carrying real, shipped features can sit unmerged for months.

**Before claiming a feature does not exist, was removed, or was never
built — run the pre-flight and check the deployed commit:**

```bash
./scripts/preflight.sh https://<the-live-url>
```

It fetches all refs, reports local vs `origin/main`, lists every branch
with unmerged commits by recency, and identifies which commit the live
build actually corresponds to by hashing its `app.js`.

Set the URL once so it is never guessed:

```bash
export CINETRACK_URL=https://<the-live-url>
```

### The specific failure this prevents

An "episodes behind" indicator was reported missing. A `git log --all -S`
search ran against a clone that had not been fetched, returned nothing, and
the feature was declared nonexistent. It was on `claude/design-polish-round2`
and running in production the whole time. Rolling the deployment back proved it.

Three things went wrong, all avoidable:

1. Searched without fetching first.
2. Searched the working tree instead of all refs.
3. Asserted absence from a single negative grep.

**Rule:** a negative search result is never proof of absence. If you cannot
find something the user says exists, say *"I cannot find it — where did you
see it?"*, never *"it does not exist."* The user's observation of a running
build outranks your search of a local checkout.

## Branch hygiene

Many branches carry unmerged work. `./scripts/preflight.sh` lists them.
Treat anything with a recent date as potentially live. Before concluding
work was lost, check whether it simply never landed on `main`.

## Testing

```bash
npm install && npm test
```

Roughly 23 failures are pre-existing and environment-related (visual
baselines, browser-dependent UI specs). Establish the baseline count on
clean `main` before attributing any failure to your change:

```bash
git stash && npm test   # baseline
git stash pop && npm test
```

Compare counts. Only a change in the failure count is your doing.

## Episode tracking model

Two related but distinct concepts — do not conflate them:

- `total` — every episode the source has recorded for a season. TMDB
  publishes a full run (e.g. 16) the day episode 1 airs.
- `aired` — episodes actually broadcast. Derived from
  `last_episode_to_air` in `api/movie.js`, or from `next_episode_to_air`
  minus one in `calendar-model.airedProgress`.

Progress and the `+1 ep` control gate on **aired**. Entries saved before
aired-tracking carry no `aired` field; every read falls back to treating
them as fully aired so existing libraries do not regress.

`watched` still means every *scheduled* episode is watched, not merely
every aired one. Changing that definition touches the server merge and the
demote invariant in `b5e0ef8` — treat it as a separate, deliberate change.
