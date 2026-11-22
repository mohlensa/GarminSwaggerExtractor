import { JSDOM } from "jsdom";

export function fixtureDocument() {
  const enumValues = ["YDS", "UIAA", "FRENCH", "BRITISH_ADJECTIVAL", "BRITISH_TECHNICAL", "EWBANK", "BRAZILIAN", "SAXON", "VERMIN", "FONT", "DANKYU", "YDS_PM"];
  const models = [
    `<div class="model-container"><div class="model-title">SplitSummaryDTO</div><div class="markdown">Split summary.</div><div class="model"><div class="property-row"><span class="prop-name">unitOfPoolLength</span><span class="prop-type">object</span><div class="markdown">Pool length unit.</div><div class="model-box"><div class="property-row"><span class="prop-name">value</span><span class="prop-type">number</span></div></div></div><div class="property-row"><span class="prop-name">maxGradeValue</span><span class="prop-type">object</span><div class="markdown">Maximum grade value and its grading scale for the split.</div><div class="model-box"><div class="property-row"><span class="prop-name">valueKey</span><span class="prop-type">string</span><span class="prop-example">_5_1</span><div class="markdown">Grade value key.</div></div><div class="property-row"><span class="prop-name">scale</span><span class="prop-type">string</span><div class="prop-enum">${enumValues.map((value) => `<span class="enum-item">${value}</span>`).join("")}</div></div></div></div><div class="property-row"><span class="prop-name">distance</span><span class="prop-type">number</span><div class="prop-example">1.2</div><div class="markdown">Split distance.</div><div class="prop-constraint">minimum: 0</div></div></div></div>`,
    `<div class="model-container"><div class="model-title">ActivityTypeDTO</div><div class="model"><div class="property-row"><span class="prop-name">typeKey</span><span class="prop-type">string</span><div class="markdown">Activity category.</div></div><div class="property-row"><span class="prop-name">parentTypeId</span><span class="prop-type">integer</span></div></div></div>`,
    `<div class="model-container"><div class="model-title">SelfRecursiveDTO</div><div class="model"><div class="property-row"><span class="prop-name">child</span><span class="prop-type">SelfRecursiveDTO</span></div></div></div>`
  ].join("");
  const { window } = new JSDOM(`<html><head><title>Swagger UI</title></head><body><div id="swagger-ui"><div class="models">${models}</div></div></body></html>`);
  window.Element.prototype.getClientRects = () => [{ width: 1, height: 1 }];
  return window.document;
}
