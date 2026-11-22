# Garmin Swagger Extractor

Standalone browser-side utility for cataloging schema documentation exposed in the rendered Swagger UI. It reads the current page DOM only. It does not make network requests, authenticate, access Garmin accounts, or access user data.

> Independent research tooling. Not affiliated with or endorsed by Garmin. Use only where you are authorized to view the documentation; do not bypass access controls.

## Requirements

- Node.js 20+ and npm (for building/testing).
- A browser already displaying the official Garmin Connect Personal API Swagger UI and its Schemas section. The tool does not navigate to the site or obtain access.

## Build and run

```sh
npm ci
npm test
npm run build
```

Open the page with Swagger UI, expand the **Schemas** section if necessary, then paste the contents of `dist/garmin-swagger-extractor.js` into that page's browser DevTools console. Review your browser's download prompt if shown. The bundle downloads two files:

- `garmin-schema-catalog.json` — versioned catalog (`formatVersion: 1`), models, descriptions, properties, paths, types, examples, enums, metadata, and explicit metadata availability.
- `garmin-extraction-report.json` - schema/property coverage counts, warnings/errors, per-schema summaries, capture source/time, and limitations.

The report status is `CAPTURED — COMPLETENESS UNVERIFIED` unless extraction warnings are present; this is not a live compatibility or completeness verdict.

To check a captured catalog against the supplied manual SplitSummaryDTO reference:

```sh
npm run validate -- garmin-schema-catalog.json
```

The validator reports per-check `PASS`, `FAIL`, or `NOT VERIFIABLE`; overall `PASS` only means the supplied catalog values match the manual references, not that the live DOM was fully extracted. It never edits or forces extraction results to match. Do not use `npm run extract` expecting a standalone browser: this command intentionally reports that a DOM must be supplied by the open page.

## Architecture

`src/extractor.js` is a DOM-only adapter for observable Swagger UI model containers, property rows, descriptions, enum text, and nested model boxes. It expands documentation controls in bounded passes, de-duplicates model names, preserves dot-delimited property paths, and records missing metadata as `not-exposed`. `src/serialize.js` emits independent catalog/report structures. `src/browser-entry.js` handles JSON downloads. A bundled IIFE is produced with esbuild; the extractor contains no `fetch`, XHR, WebSocket, or Garmin endpoint calls. Use `npm test`, `npm run lint`, and `npm run build` for checks.

The UI DOM is not a stable API. Selectors are intentionally centralized in the extractor, and missing/duplicate content and bounded expansion produce warnings. The schema catalog records the captured page title and time for provenance.

## Validation and project status

See [STATUS.md](STATUS.md) for milestone evidence and known blockers. Automated tests use synthetic DOM fixtures, including nested objects, enum values, descriptions, primitive metadata, multiple schemas, empty DOM, and expansion behavior. These verify implementation behavior, not the current live Swagger UI. The manually supplied 225-row SplitSummaryDTO observation is maintained as an acceptance check, not fabricated as a successful capture.

The current adapter targets the manually observed DOM shape: `tr.property-row` with a plain-text first `td`, documentation fields in the second `td`, `.prop-type`, `.renderedMarkdown`, `.property.primitive`, `.prop-enum`, `button.model-box-control`, `table.model`, and `.inner-object`. Expanded objects’ `tr.description` rows are retained separately as `objectDescription`. Enum values found while their enclosing model control still reports collapsed are preserved but marked `partially-exposed`; do not treat those values as complete until inspected in the live UI.

## Limitations

- A live Swagger UI DOM capture has not been verified by the maintainers in this environment; actual browser markup may require selector adjustments.
- Documentation hidden behind controls not recognized by the expansion adapter may remain unobserved; review expansion warnings and report counts.
- Constraint parsing is best-effort for labels/text exposed in rendered rows. Values rendered only in non-text widgets may not be recovered.
- Coverage is limited to rendered documentation and is not a claim about server or API completeness.
- The extractor does not inspect network responses, browser storage, account data, or any content outside Swagger schema/model UI elements.

## Development

```sh
npm test
npm run build
```

MIT licensed; see [LICENSE](LICENSE).
