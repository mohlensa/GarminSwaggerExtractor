# Project status — remediation 1.0.1

Updated: 2026-11-23

## Milestones

| Stage | Status | Evidence / limitations |
|---|---|---|
| 1 — DOM mechanism | PASS WITH LIMITATIONS | Adapter and fixture now use the manually observed table-based Swagger DOM. No live page was accessible, so actual browser compatibility is pending. |
| 2 — Extraction engine | PASS WITH LIMITATIONS | Added table-cell name/type/description/metadata extraction, enum state, inline object description, nested properties and provenance paths. Synthetic fixture tests only. |
| 3 — Discovery and traversal | PASS WITH LIMITATIONS | Traverses nested `table.model` DOMs with row ownership checks and duplicate diagnostics; bounded expansion is restricted to model controls in the schemas container. No external `$ref` resolution. |
| 4 — Completeness/fidelity | PASS WITH LIMITATIONS | Report differentiates exposed, missing, and collapsed/partial metadata; capture status no longer claims PASS/completeness. Live completeness unknown. |
| 5 — Acceptance testing | BLOCKED — LIVE | Validator supports PASS/FAIL/NOT VERIFIABLE against the 225-property and `maxGradeValue` references. Only synthetic cases have run; no actual catalog has been validated. |
| 6 — Packaging/publication | PASS WITH LIMITATIONS | Remediation is committed and pushed; v1.0.0 remains unchanged. No v1.0.1 release is tagged because live acceptance is pending. |

## Remediation evidence

- v1.0.0 root causes: `.prop-name` was assumed for names; test rows were `div.property-row`; schema discovery expected `.model-container`; nested DOM was queried as descendants without table boundaries; enum completeness did not account for collapsed model controls; validator collapsed absence into FAIL and trusted a name-only lookup.
- New fixtures represent `table.model`, `tr.property-row`, plain-text first-cell names, second-cell detail, `.property.primitive`, `.prop-type`, `.renderedMarkdown`, `.prop-enum`, `button.model-box-control`, `.inner-object`, and `tr.description`.
- Tests cover extraction, serialization, nested inline objects, examples/descriptions, metadata, absent/malformed rows, empty objects, absent/collapsed enum states, bounded expansion and click errors, report coverage, and three-way acceptance status.
- The 225 reference count is used only by the validator. It is not injected into extraction output.
- Live compatibility status: **PENDING**. No Garmin DOM, account content, network response, or endpoint was accessed during this remediation.
- Quality checks: `npm test` 11/11 pass; `npm run lint` pass; `npm run build` pass; `npm audit` zero vulnerabilities; `git diff --check` pass.

## Remaining owner action

Using an authorized browser already displaying the official Personal API Swagger UI, run the generated browser bundle with the Schemas section open. Inspect the report and catalog; verify `SplitSummaryDTO.directPropertyCount == 225`, the five known enum-bearing properties, and the `maxGradeValue` description/children/12 ordered enum values. Then run `npm run validate -- <captured-catalog.json>`. Report unexpected omissions or partial enum state before calling live acceptance PASS.
