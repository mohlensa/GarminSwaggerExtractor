import { JSDOM } from "jsdom";

const scales = ["YDS", "UIAA", "FRENCH", "BRITISH_ADJECTIVAL", "BRITISH_TECHNICAL", "EWBANK", "BRAZILIAN", "SAXON", "VERMIN", "FONT", "DANKYU", "YDS_PM"];
const enumMarkup = (values) => values.map((value) => `<li>${value}</li>`).join("");

function property(name, type, body = "", description = "") {
  return `<tr class="property-row"><td>${name}</td><td><div class="property primitive"><span class="prop-type">${type}</span>${description ? `<div class="renderedMarkdown"><p>${description}</p></div>` : ""}${body}</div></td></tr>`;
}

function objectProperty(name, description, children, { collapsed = false, enumButton = "" } = {}) {
  return `<tr class="property-row"><td>${name}</td><td><div class="property"><span class="prop-type">object</span><div class="inner-object"><button class="model-box-control" aria-expanded="${collapsed ? "false" : "true"}">model</button><table class="model"><tbody><tr class="description"><td colspan="2"><div class="renderedMarkdown"><p>${description}</p></div></td></tr>${children}${enumButton}</tbody></table></div></div></td></tr>`;
}

export function fixtureDocument() {
  const grade = objectProperty("maxGradeValue", "Maximum grade value and its grading scale for the split.",
    `${property("valueKey", "string", `<span class="prop-example">_5_1</span>`, "Key identifying the climbing grade within the specified scale. For example, _5_1 represents grade 5.1 on the YDS scale.")}${property("scale", "string", `<div class="prop-enum"><button class="model-box-control" aria-expanded="true">enum</button><ul>${enumMarkup(scales)}</ul></div>`)}`, { collapsed: true });
  const split = `<table class="model"><caption class="model-title">SplitSummaryDTO</caption><tbody><tr class="description"><td colspan="2"><div class="renderedMarkdown">Split summary documentation.</div></td></tr>${objectProperty("unitOfPoolLength", "Pool length unit.", property("value", "number"))}${grade}${property("distance", "number", `<span class="prop-format">minimum: 0</span><span class="prop-example">1.2</span>`, "Distance of the split.")}</tbody></table>`;
  const other = `<table class="model"><caption class="model-title">ActivityTypeDTO</caption><tbody>${property("typeKey", "string", "", "Activity category.")}${property("parentTypeId", "integer")}</tbody></table>`;
  const recursion = `<table class="model"><caption class="model-title">SelfRecursiveDTO</caption><tbody>${property("child", "SelfRecursiveDTO")}</tbody></table>`;
  const { window } = new JSDOM(`<html><head><title>Swagger UI</title></head><body><div id="swagger-ui"><div class="models">${split}${other}${recursion}</div></div></body></html>`);
  window.Element.prototype.getClientRects = () => [{ width: 1, height: 1 }];
  return window.document;
}

export { property, objectProperty, scales };
