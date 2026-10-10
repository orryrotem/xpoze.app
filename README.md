# Xpose

A TypeScript / React app for exploring how an X post gains interactions over time.

## Core experience

Paste a link to an X post to view a graphical timeline of likes, reposts, replies (comments), and quote posts. Show the source post, interaction totals, a time-based chart, and filters for interaction type and time range.

The timeline should distinguish events with known timestamps from changes in engagement counts observed between collection snapshots. Missing historical data should appear as unavailable rather than as zero activity.

## Future feature

Geographic spread is an optional future feature that needs further product development. It is outside the initial release. Bot detection and account authenticity scoring are also outside the current core scope.

## Background and current status

The attached architecture PDF provides background for an earlier geographic inference and bot detection concept. Its proposed pipeline and rollout are not requirements for the timeline product.

The repository includes an interactive React prototype with clearly labeled synthetic data. It validates post links locally and offers type filters, time ranges, count totals, hourly net changes, snapshot inspection, and a data table. Live X integration has not been implemented.

## Run locally

Use Node.js 22.18+ or 24+ and Yarn through Corepack. The Yarn version is pinned in `package.json`.

```sh
corepack enable yarn
yarn install
yarn dev
```

For a production preview, run `yarn build` followed by `yarn preview`. Run `yarn test` to check post URL validation and timeline calculations. Use `yarn install --immutable` in CI.

See [the product scope](docs/product-scope.md) for the proposed MVP and data requirements.
