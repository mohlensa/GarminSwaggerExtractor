# Changelog

## 1.0.1 — DOM compatibility remediation (unreleased)

- Target the observed Swagger table DOM: `table.model`, `tr.property-row`, plain-text first-cell names, second-cell details, nested `.inner-object` tables, and `tr.description`.
- Preserve nested object descriptions, primitive metadata, examples, Markdown descriptions, and nested enum values in serialized JSON.
- Add explicit enum exposure state and prevent collapsed/partial content from being reported as a confirmed complete enum.
- Restrict expansion to schema documentation controls and bound the number of passes; report failures and remaining collapsed controls.
- Change acceptance validation to distinguish PASS, FAIL, and NOT VERIFIABLE.
- Replace div-based fixtures with table-based DOM fixtures and expand coverage to malformed and partial DOM cases.
- Live Swagger UI acceptance remains pending; no live result is claimed.
