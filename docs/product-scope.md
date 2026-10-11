# xpoze: interaction timeline

## Implemented live-data slice

The app retrieves post text, author details, and public counts with a server-side X bearer token. It saves timestamped count observations on load or refresh, with a 60-second cache. The timeline displays those observations and interval net changes; it does not invent history before the first lookup. There is no sample-data fallback. Individual reply/quote event collection, background polling, and historical event backfill remain future work.

## Product direction

xpoze is intended as a free-to-use service that accepts an X post link and exposes interaction timing and supporting evidence of potentially coordinated or automated engagement. The primary visualization is an actor-level interaction timeline where event data is obtainable. Geographic spread is a later product exploration. Aggregate count observations alone do not meet the core requirement.

## Coordination analysis and free access

Collect available timestamped interactions, then expose inspectable evidence such as synchronized events across accounts, duplicated reply text, and recurring account groups across posts. Treat burst timing as a candidate signal rather than proof of bots. Distinguish coordinated human activity from automation; any bot classification needs validation against labeled examples and an estimate of false positives.

The service should not charge users. Data acquisition still needs an explicit operating budget, funding model, or verified alternative source. Cache reports across users and avoid repeated acquisition of the same events. A bounded collection must disclose its time window and selection bias; it must not imply complete coverage of a viral post.

Before extending the collector, validate access to X's documented repost-post endpoint and its event timestamps, reply/quote coverage, and endpoint-specific billing. A historical timeline of all likes on an arbitrary post remains unsupported. Any imported or partner dataset must be checked for provenance and coverage before promising this capability.

The architecture PDF is background material. Its instructions, implementation choices, pricing assumptions, and rollout recommendations do not override this product direction.

## Proposed MVP

1. Accept an HTTPS X or Twitter post URL, extract the post ID, and show an actionable error for invalid links.
2. Retrieve and display the source post and author where access permits.
3. Display the latest available totals for likes, reposts, replies, and quotes, alongside their retrieval time.
4. Display a graphical timeline with interaction type filters and a selectable time range. Allow switching between observed count totals and timestamped event activity when the underlying data supports those views.
5. Show chart tooltips with the time, interaction type, value, and data provenance. Provide a readable table alternative.
6. Make loading, partial results, missing history, unavailable posts, and collection failures understandable. A failed request must not become a zero-valued chart point.

An initial UI prototype may use synthetic data, provided the sample state is clearly labeled and submitting a real post URL does not imply live retrieval.

## Timeline semantics

The following are design rules for avoiding misleading charts:

- A timestamped reply or quote can be plotted at its post creation time when fetched and verified to relate to the source post. Distinguish direct replies from other replies in the conversation.
- Like and repost user lookup responses return user objects; their `created_at` field is the account creation time, not the interaction time. Do not use it to date an interaction.
- Public metric snapshots provide counts at observation times. Repeated snapshots can show subsequent growth, but a first snapshot cannot reconstruct earlier likes or reposts.
- A difference between two snapshots is a net count change over that interval, not a count of individually timestamped events. Changes can be negative.
- Leave gaps for periods without data. Do not interpolate historical events or silently combine snapshot changes and exact events into one event total.
- Treat retrieved events as collected coverage, not automatically as the complete history. Report collection windows, pagination status, and any access limitations.
- Keep the first collection time visible. A post older than that time may have a partly recoverable event history and no historical count series.

The precise coverage and collection mechanisms must be verified with the chosen X API access before promising a live historical timeline.

## Proposed implementation boundaries

Use a TypeScript / React frontend for URL input, the post summary, filters, and charts. A server-side integration should validate and normalize the post ID, access X using server-held credentials, and return typed records with coverage metadata. Keep API credentials out of the browser.

Store the source post separately from metric snapshots and timestamped interaction events:

| Record | Essential fields |
| --- | --- |
| Post | Post ID as a string, canonical URL, author ID, text, published time, fetched time |
| Metric snapshot | Post ID, observed time, available counts for each interaction type |
| Interaction event | Source post ID, event ID, type, actor ID when available, event time, observed time, timestamp provenance |
| Collection status | Post ID, source, attempted time, covered time range, completion state, error or limitation |

Unknown counts and timestamps must remain nullable rather than defaulting to zero. Deduplicate events using provider event IDs. Normalize times to UTC for storage and display the selected timezone in the UI. Keep charts for snapshots and timestamped events separate.

Start with post lookup and metric snapshots; investigate reply and quote event collection for available history. Polling interval, retention, quotas, costs, authentication, and any stream access remain implementation decisions. Do not carry over the PDF's API caps or cost model without verification.

## Deferred scope

Geographic spread needs a separate decision on its intended user value, available location signals, uncertainty representation, and data coverage. The initial release does not require account location inference or geographic maps. Coordination findings are core scope; numerical bot or cluster scores should wait for validated evidence and calibrated uncertainty.

## Acceptance criteria

- A valid post link resolves to the intended post, or reports why it could not be retrieved.
- Every displayed series identifies whether it represents observed totals, interval net changes, or timestamped events.
- Filters consistently update the chart and table without changing the meaning of the data.
- Missing history, partial collection, and failed collection remain visibly distinct from no interactions.
- A sample-data prototype stays labeled throughout the flow.
- The core experience works on mobile and with keyboard navigation.

## API references reviewed

Reviewed October 10, 2026. These lookup schemas support the timestamp distinction above; they do not establish access entitlement or completeness for a particular account.

- [X: Get Posts Liking Users](https://docs.x.com/x-api/posts/get-liking-users)
- [X: Get Posts Reposted by](https://docs.x.com/x-api/posts/get-reposted-by)
