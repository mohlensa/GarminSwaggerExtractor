import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { extractRenderedSchemas, extractSwaggerDocumentation } from "../src/extractor.js";
import { buildCatalog, buildReport } from "../src/serialize.js";
import { fixtureDocument, property, scales } from "./fixtures.js";
import { validateCatalog } from "../src/validate.js";

test("reads real-shaped table rows with plain-text names and details in second cell", () => {
  const result = extractRenderedSchemas(fixtureDocument());
  assert.equal(result.schemas.length, 3);
  const split = result.schemas[0];
  assert.equal(split.name, "SplitSummaryDTO");
  assert.equal(split.directPropertyCount, 3);
  assert.deepEqual(split.properties.map(({ name }) => name), ["unitOfPoolLength", "maxGradeValue", "distance"]);
  assert.equal(split.properties[2].type, "number");
  assert.equal(split.properties[2].description, "Distance of the split.");
});

test("preserves inline object description, multilevel child paths, example markdown and nested enum", () => {
  const split = extractRenderedSchemas(fixtureDocument()).schemas[0];
  const grade = split.properties[1];
  assert.equal(grade.kind, "object");
  assert.equal(grade.objectDescription, "Maximum grade value and its grading scale for the split.");
  assert.equal(grade.children[0].path, "SplitSummaryDTO.maxGradeValue.valueKey");
  assert.equal(grade.children[0].example, "_5_1");
  assert.match(grade.children[0].description, /grade 5\.1 on the YDS scale/);
  assert.deepEqual(grade.children[1].enum, scales);
  assert.equal(grade.children[1].enumState, "present");
  assert.equal(split.properties[0].children[0].path, "SplitSummaryDTO.unitOfPoolLength.value");
});

test("catalog recursively serializes child properties and enum values", () => {
  const catalog = buildCatalog(extractRenderedSchemas(fixtureDocument()));
  const grade = catalog.schemas[0].properties[1];
  assert.equal(grade.children, undefined);
  assert.deepEqual(grade.properties[1].enum, scales);
  assert.equal(grade.properties[1].enumState, "present");
  assert.equal(grade.properties[0].availability.example, "present");
});

test("coverage report counts nested rows and missing metadata without claiming completeness", () => {
  const report = buildReport(extractRenderedSchemas(fixtureDocument()));
  assert.equal(report.coverage.schemas, 3);
  assert.equal(report.coverage.directProperties, 6);
  assert.equal(report.coverage.nestedProperties, 3);
  assert.equal(report.coverage.enums, 2);
  assert.ok(report.coverage.missingDescriptions > 0);
  assert.equal(report.status, "CAPTURED — COMPLETENESS UNVERIFIED");
});

test("missing and malformed rows produce diagnostics and partial records", () => {
  const { window } = new JSDOM(`<div class="models"><table class="model"><caption>OddDTO</caption><tbody><tr class="property-row"><td></td><td><div class="property primitive"></div></td></tr><tr class="property-row"><td>blank</td><td></td></tr></tbody></table></div>`);
  const result = extractRenderedSchemas(window.document);
  assert.equal(result.schemas[0].directPropertyCount, 2);
  assert.ok(result.warnings.some((warning) => warning.includes("no readable first-cell name")));
  assert.equal(result.schemas[0].properties[1].type, null);
  assert.equal(result.schemas[0].properties[1].availability.description, "not-exposed");
});

test("handles empty objects, non-table inline objects, null document, and unexpected controls", () => {
  const { window } = new JSDOM(`<div class="models"><table class="model"><caption>EmptyDTO</caption><tbody>${property("empty", "object", `<span class="inner-object"></span>`)}</tbody></table></div>`);
  const extracted = extractRenderedSchemas(window.document);
  assert.equal(extracted.schemas[0].properties[0].kind, "object");
  assert.deepEqual(extracted.schemas[0].properties[0].children, []);
  assert.throws(() => extractRenderedSchemas(null), /Document is required/);
});

test("empty or wrong-page captures are diagnosed rather than reported as successful", () => {
  const { window } = new JSDOM(`<html><head><title>Program FAQ</title></head><body><div id="swagger-ui"></div></body></html>`);
  const result = extractRenderedSchemas(window.document);
  const report = buildReport(result);
  assert.equal(result.schemas.length, 0);
  assert.equal(report.status, "FAILED — NO SCHEMAS FOUND");
  assert.equal(result.source.swaggerUiFound, true);
  assert.equal(result.source.schemasPanelFound, false);
  assert.ok(result.warnings.some((warning) => warning.includes("Schemas panel")));
  assert.ok(result.warnings.some((warning) => warning.includes("No top-level table.model")));
});

test("enum states distinguish absent, empty/collapsed and malformed values", () => {
  const { window } = new JSDOM(`<div class="models"><table class="model"><caption>Enums</caption><tbody>${property("absent", "string")}${property("collapsed", "string", `<div class="prop-enum"><button class="model-box-control" aria-expanded="false">expand enum</button></div>`)}${property("malformed", "string", `<div class="prop-enum"><button>Enum values</button></div>`)}</tbody></table></div>`);
  const props = extractRenderedSchemas(window.document).schemas[0].properties;
  assert.equal(props[0].enumState, "not-exposed");
  assert.equal(props[1].enumState, "partially-exposed");
  assert.equal(props[2].enumState, "empty-or-collapsed");
});

test("expands collapsed Swagger model and enum controls only within bounded passes", async () => {
  const { window } = new JSDOM(`<div class="models"><button class="model-box-control" aria-expanded="false">expand</button><button class="model-box-control" aria-expanded="false">enum</button></div>`);
  for (const control of window.document.querySelectorAll("button")) {
    control.click = () => control.setAttribute("aria-expanded", "true");
  }
  const result = await extractSwaggerDocumentation(window.document, { maxPasses: 1, settleMs: 0 });
  assert.ok([...window.document.querySelectorAll("button")].every((button) => button.getAttribute("aria-expanded") === "true"));
  assert.ok(!result.warnings.some((warning) => warning.includes("expansion")));
});

test("bounded passes report controls that remain collapsed and click exceptions", async () => {
  const { window } = new JSDOM(`<div class="models"><button class="model-box-control" aria-expanded="false">expand</button><button class="model-box-control" aria-expanded="false">throws</button></div>`);
  window.document.querySelectorAll("button")[1].click = () => { throw new Error("blocked"); };
  const result = await extractSwaggerDocumentation(window.document, { maxPasses: 1, settleMs: 0 });
  assert.ok(result.warnings.some((warning) => warning.includes("threw")));
  assert.ok(result.warnings.some((warning) => warning.includes("remain collapsed")));
});

test("acceptance validator distinguishes unavailable catalog, fail, and confirmed fixture match", () => {
  const absent = validateCatalog({ schemas: [] });
  assert.equal(absent.status, "NOT VERIFIABLE");
  const synthetic = buildCatalog(extractRenderedSchemas(fixtureDocument()));
  assert.equal(validateCatalog(synthetic).status, "FAIL");
  const accepted = structuredClone(synthetic);
  const split = accepted.schemas[0];
  split.directPropertyCount = 225;
  const grade = split.properties.find(({ name }) => name === "maxGradeValue");
  grade.properties[0].description = "Key identifying the climbing grade within the specified scale. For example, _5_1 represents grade 5.1 on the YDS scale.";
  assert.equal(validateCatalog(accepted).status, "PASS");
});

test("validator marks fields not verifiable when reference evidence is missing", () => {
  const catalog = { schemas: [{ name: "SplitSummaryDTO", directPropertyCount: 225, properties: [] }] };
  const result = validateCatalog(catalog);
  assert.equal(result.status, "NOT VERIFIABLE");
  assert.ok(result.checks.some((check) => check.status === "NOT VERIFIABLE"));
});

test("regression: extracts screenshot-captured splitSummaries shape with wrapper enum and documented example", () => {
  const { window } = new JSDOM(`<div class="models"><table class="model"><caption>#/components/schemas/ApplicationFormatDTOApplicationFormatDTO</caption><tbody><tr class="property-row"><td>splitSummaries</td><td><div class="property"><span class="prop-type">string</span><div class="inner-object"><table class="model"><tbody>${property("startTimeLocal", "string")}${property("maxGradeValue", "string", `<div class="renderedMarkdown">Maximum grade value and its grading scale for the split</div><div class="inner-object"><table class="model"><tbody>${property("valueKey", "string", "", "Key identifying the climbing grade within the specified scale. For example, _5_1 represents grade 5.1 on the YDS scale.")}${property("scale", "string", `<div class="prop-enum">Enum:[ YDS, UIAA, FRENCH, BRITISH_ADJECTIVAL, BRITISH_TECHNICAL, EWBANK, BRAZILIAN, SAXON, VERMIN, FONT, DANKYU, YDS_PM ]</div>`)}</tbody></table></div>`)}</tbody></table></div></td></tr></tbody></table></div>`);
  const result = extractRenderedSchemas(window.document);
  assert.equal(result.schemas.length, 1);
  assert.ok(result.schemas.every(({ name }) => name === "ApplicationFormatDTO"));
  assert.equal(result.schemas[0].name, "ApplicationFormatDTO");
  const splitSummaries = result.schemas[0].properties[0];
  assert.equal(splitSummaries.children.length, 2);
  const grade = splitSummaries.children[1];
  assert.equal(grade.objectDescription, "Maximum grade value and its grading scale for the split");
  assert.equal(grade.children[0].example, "_5_1");
  assert.deepEqual(grade.children[1].enum, scales);
});

test("acceptance validator locates splitSummaries nested inside a containing schema", () => {
  const catalog = { schemas: [{ name: "ApplicationFormatDTO", properties: [{ name: "splitSummaries", kind: "object", directPropertyCount: 225, properties: [{ name: "maxGradeValue", objectDescription: "Maximum grade value and its grading scale for the split.", properties: [{ name: "valueKey", type: "string", example: "_5_1" }, { name: "scale", type: "string", enum: scales }] }] }] }] };
  assert.equal(validateCatalog(catalog).status, "PASS");
});
