# xpoze: interaction timeline

## Product direction

xpoze accepts an X post link and helps a user understand how engagement develops over time. The primary visualization is a timeline, with likes, reposts, replies, and quote posts as separate interaction types. Geographic spread is a later product exploration.

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

Geographic spread needs a separate decision on its intended user value, available location signals, uncertainty representation, and data coverage. The MVP does not require account location inference, recent account history collection, geographic maps, bot scores, or cluster scoring.

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
