# xpoze

A free-to-use TypeScript / React service for inspecting an X post's interaction timeline and surfacing evidence of potentially coordinated or automated engagement.

## Core experience

Paste a link to an X post to inspect when available interactions occurred and which accounts participated. The intended experience highlights timing bursts, repeated content, synchronized account activity, and recurring groups of accounts where the collected evidence supports those findings. Show underlying evidence, data coverage, and uncertainty; a burst alone is not proof of bots.

The timeline should distinguish events with known timestamps from changes in engagement counts observed between collection snapshots. Missing historical data should appear as unavailable rather than as zero activity.

## Future feature

Geographic spread is an optional future feature that needs further product development. It is outside the initial release. Evidence of potentially inauthentic coordination is the core purpose; validated account-level bot classification is not yet implemented.

## Background and current status

The attached architecture PDF provides background for an earlier geographic inference and bot detection concept. Its proposed pipeline and rollout are not requirements for the timeline product.

The React app retrieves real post text, author details, and public engagement counts through a server-side X API integration. It saves observations per post and offers type filters, time ranges, count totals, interval net changes, snapshot inspection, and a data table. There is no sample-data fallback.

The current implementation is a count-observation foundation, not the intended coordination-analysis service. It does not retrieve individual interaction events or detect bots. Historical event collection, evidence-based coordination analysis, and an acquisition budget or alternative data source are required. Free access for users does not eliminate upstream data costs. A complete historical like timeline for arbitrary posts is not supported by the lookup integration.

## Run locally

Use Node.js 22.18+ or 24+ and Yarn through Corepack. The Yarn version is pinned in `package.json`.

```sh
corepack enable yarn
yarn install
yarn dev
```

For a production preview, run `yarn build` followed by `yarn preview`. Run `yarn test` to check post URL validation and timeline calculations. Use `yarn install --immutable` in CI.

## Configure live data

Copy `.env.example` to `.env` and set `X_BEARER_TOKEN` to your X developer app's bearer token. Keep it out of source control and never prefix it with `VITE_`. Restart the server after configuring credentials. The browser calls local `/api` routes; the server calls `https://api.x.com/2/tweets/:id`. Your X app needs post lookup access and available API credits.

Submit a post link to retrieve its latest counts. Refresh to collect another observation. Responses are cached for 60 seconds per post to limit repeated API reads. No automatic polling or historical backfill runs. Observations persist locally in `.data/posts/`, which is ignored by Git. Failed requests do not add chart points.

The first lookup produces one real observation, not a historical curve. A second observation allows interval net changes. These changes may be negative and do not identify individual like/repost times. Unreturned counts remain unavailable. The time-range filter is relative to the latest recorded observation.

The API middleware runs in both `yarn dev` and `yarn preview`. A static upload of `dist/` alone cannot provide live data; hosted deployment needs a server for the `/api` routes and persistent storage. This setup is intended for local use.

API reference: [X post lookup](https://docs.x.com/x-api/posts/get-post-by-id).

See [the product scope](docs/product-scope.md) for the proposed MVP and data requirements.
