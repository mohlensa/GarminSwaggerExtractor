# Changelog

## 1.0.2 — Live catalog evidence fixes (unreleased)

- Recognize repeated DTO names in the rendered title and retain normalized schema identity.
- Validate `splitSummaries` when embedded as an inline object in a containing schema.
- Recover primitive examples when rendered in description text (without inventing values).
- Parse bracketed `Enum:[ ... ]` text cleanly, including one-node wrapped renderings.
- Detect an absent Swagger root, missing Schemas panel, and zero model tables; empty extraction is an explicit failure, not a clean capture.
- Include root/panel/model-table presence in provenance and log actionable failure details to Console.
- Require the Schemas panel to be inside `#swagger-ui`; unrelated `.models` elements no longer produce a false panel-present diagnostic.
- Add regression coverage for the supplied live catalog structure.
- Live re-capture is still required; no acceptance result is claimed.

## 1.0.1 — DOM compatibility remediation (unreleased)

- Target the observed Swagger table DOM: `table.model`, `tr.property-row`, plain-text first-cell names, second-cell details, nested `.inner-object` tables, and `tr.description`.
- Preserve nested object descriptions, primitive metadata, examples, Markdown descriptions, and nested enum values in serialized JSON.
- Add explicit enum exposure state and prevent collapsed/partial content from being reported as a confirmed complete enum.
- Restrict expansion to schema documentation controls and bound the number of passes; report failures and remaining collapsed controls.
- Change acceptance validation to distinguish PASS, FAIL, and NOT VERIFIABLE.
- Replace div-based fixtures with table-based DOM fixtures and expand coverage to malformed and partial DOM cases.
- Live Swagger UI acceptance remains pending; no live result is claimed.
