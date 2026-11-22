import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { extractRenderedSchemas, extractSwaggerDocumentation } from "../src/extractor.js";
import { buildCatalog, buildReport } from "../src/serialize.js";
import { fixtureDocument } from "./fixtures.js";
import { validateCatalog } from "../src/validate.js";

test("extracts schemas, primitive metadata, inline objects, descriptions and nested enums", () => {
  const { window } = new JSDOM("<html><body></body></html>");
  globalThis.DOMParser = window.DOMParser;
  const result = extractRenderedSchemas(fixtureDocument());
  assert.equal(result.schemas.length, 3);
  const split = result.schemas[0];
  assert.equal(split.directPropertyCount, 3);
  assert.equal(split.properties[0].kind, "object");
  assert.equal(split.properties[0].children[0].path, "SplitSummaryDTO.unitOfPoolLength.value");
  const grade = split.properties[1];
  assert.equal(grade.description, "Maximum grade value and its grading scale for the split.");
  assert.equal(grade.children[0].example, "_5_1");
  assert.deepEqual(grade.children[1].enum, ["YDS", "UIAA", "FRENCH", "BRITISH_ADJECTIVAL", "BRITISH_TECHNICAL", "EWBANK", "BRAZILIAN", "SAXON", "VERMIN", "FONT", "DANKYU", "YDS_PM"]);
  assert.equal(split.properties[2].metadata.minimum, "0");
});

test("catalog and coverage report are deterministic apart from capture time", () => {
  const { window } = new JSDOM("<html></html>");
  globalThis.DOMParser = window.DOMParser;
  const result = extractRenderedSchemas(fixtureDocument());
  const catalog = buildCatalog(result);
  const report = buildReport(result);
  assert.equal(catalog.formatVersion, 1);
  assert.equal(catalog.schemas[0].properties[1].properties[1].enum.length, 12);
  assert.equal(report.coverage.schemas, 3);
  assert.equal(report.coverage.directProperties, 6);
  assert.equal(report.coverage.enums, 2);
  assert.ok(report.coverage.missingDescriptions > 0);
});

test("rejects absent document and handles empty UI", () => {
  assert.throws(() => extractRenderedSchemas(null), /Document is required/);
  const { window } = new JSDOM("<html><body><div id='swagger-ui'></div></body></html>");
  const result = extractRenderedSchemas(window.document);
  assert.deepEqual(result.schemas, []);
});

test("expands only visible documentation controls and returns bounded warning", async () => {
  const { window } = new JSDOM("<html><body><div class='model-box-control' aria-expanded='false'></div></body></html>");
  const control = window.document.querySelector(".model-box-control");
  control.getClientRects = () => [{ width: 1 }];
  control.click = () => control.setAttribute("aria-expanded", "true");
  const result = await extractSwaggerDocumentation(window.document, { maxPasses: 1, settleMs: 0 });
  assert.equal(control.getAttribute("aria-expanded"), "true");
  assert.ok(result.warnings.includes("Expansion stopped after 1 passes."));
});

test("acceptance validator reports mismatches instead of changing extracted evidence", () => {
  const { window } = new JSDOM("<html></html>");
  globalThis.DOMParser = window.DOMParser;
  const catalog = buildCatalog(extractRenderedSchemas(fixtureDocument()));
  const result = validateCatalog(catalog);
  assert.equal(result.status, "FAIL");
  assert.ok(result.discrepancies.some((item) => item.includes("expected 225, observed 3")));
});
