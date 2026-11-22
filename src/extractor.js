/**
 * Read schema documentation from the rendered Swagger UI DOM only. This module
 * intentionally makes no network requests and never examines page data outside
 * the Swagger model/schema panels.
 */
const clean = (value) => value?.replace(/\s+/g, " ").trim() ?? "";
const text = (element) => clean(element?.textContent ?? "");
const visible = (element) => Boolean(element && element.getClientRects().length);

function descriptionIn(container) {
  return text(container?.querySelector(".markdown, .renderedMarkdown, .prop-format + .markdown")) || null;
}

function propertyName(row) {
  const name = row.querySelector(".property-row .prop-name, .prop-name");
  return text(name).replace(/\s*\(\s*\*\s*\)\s*$/, "") || null;
}

function propertyType(row) {
  const type = row.querySelector(".prop-type");
  const value = text(type);
  if (value) return value;
  const ref = row.querySelector(".prop-format a, .prop-type a");
  return text(ref) || null;
}

function propertyDetails(row, parentPath) {
  const name = propertyName(row);
  const path = name ? `${parentPath}.${name}` : parentPath;
  const typeNode = row.querySelector(".prop-type");
  const enumValues = [...row.querySelectorAll(".prop-enum .enum-item, .prop-enum li, .enum")]
    .map(text).filter(Boolean);
  const metadata = {};
  for (const node of row.querySelectorAll(".prop-format, .prop-constraint, .prop-example, .prop-default")) {
    const raw = text(node);
    const match = raw.match(/^([\w -]+):\s*(.+)$/);
    const label = clean(node.querySelector("strong, b")?.textContent ?? match?.[1] ?? "").replace(/:$/, "").toLowerCase();
    const value = match?.[2] ?? raw;
    if (label && value) metadata[label] = value;
  }
  const exampleNode = row.querySelector(".prop-example, .example");
  const children = [...row.querySelectorAll(".property-row")]
    .filter((candidate) => candidate.parentElement?.closest(".property-row") === row);
  const kind = children.length ? "object" : enumValues.length ? "enum" : "property";
  return {
    name,
    path,
    kind,
    type: propertyType(row),
    description: descriptionIn(row),
    ...(exampleNode ? { example: text(exampleNode) || null } : {}),
    ...(enumValues.length ? { enum: [...new Set(enumValues)] } : {}),
    metadata,
    children: children.map((child) => propertyDetails(child, path)),
    availability: {
      description: descriptionIn(row) ? "present" : "not-exposed",
      example: exampleNode ? "present" : "not-exposed",
      enum: enumValues.length ? "present" : "not-exposed",
      type: typeNode || propertyType(row) ? "present" : "not-exposed"
    }
  };
}

function directRows(model) {
  const candidates = [...model.querySelectorAll(".model .property-row, .model-box .property-row, .property-row")];
  return candidates.filter((row) => !row.parentElement?.closest(".property-row"));
}

function schemaFromModel(model) {
  const title = text(model.querySelector(":scope > .model-title, :scope > .model-box > .model-title, .model-title"))
    .replace(/\s*\(\s*\d+\s*\)\s*$/, "").trim();
  if (!title) return null;
  const rows = directRows(model);
  return {
    name: title,
    description: descriptionIn(model),
    properties: rows.map((row) => propertyDetails(row, title)),
    directPropertyCount: rows.length,
    source: "rendered-swagger-ui-dom"
  };
}

/** Expand schema/inline-object panels with bounded retries; no clicks outside documentation controls. */
async function expandDocumentation(root, { maxPasses = 8, settleMs = 80 } = {}) {
  const warnings = [];
  const selectors = [".models-control .expand-operation", ".model-box-control", ".model-toggle", ".model .model-toggle"];
  for (let pass = 0; pass < maxPasses; pass += 1) {
    const controls = [...new Set(selectors.flatMap((selector) => [...root.querySelectorAll(selector)]))];
    const collapsed = controls.filter((control) => {
      if (!visible(control)) return false;
      const label = `${control.getAttribute("aria-label") ?? ""} ${control.getAttribute("title") ?? ""} ${control.className ?? ""}`.toLowerCase();
      const expanded = control.getAttribute("aria-expanded");
      return expanded === "false" || /collapsed|expand/.test(label) || control.querySelector(".collapsed");
    });
    if (!collapsed.length) break;
    for (const control of collapsed) {
      try { control.click(); } catch { warnings.push("A documentation expansion control could not be activated."); }
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, settleMs));
    if (pass === maxPasses - 1) warnings.push(`Expansion stopped after ${maxPasses} passes.`);
  }
  return warnings;
}

export function extractRenderedSchemas(documentRef = globalThis.document) {
  if (!documentRef?.querySelectorAll) throw new TypeError("A browser Document is required.");
  const containers = [...documentRef.querySelectorAll(".models, #swagger-ui")];
  const root = containers.find((candidate) => candidate.querySelector(".model-title")) ?? documentRef;
  const models = [...root.querySelectorAll(".models .model-container, .model-container")];
  const schemas = models.map(schemaFromModel).filter(Boolean);
  const unique = new Map();
  const warnings = [];
  for (const schema of schemas) {
    if (unique.has(schema.name)) warnings.push(`Duplicate rendered schema title: ${schema.name}`);
    else unique.set(schema.name, schema);
  }
  return {
    schemas: [...unique.values()],
    warnings,
    source: { method: "rendered-dom", pageTitle: documentRef.title || null, capturedAt: new Date().toISOString() }
  };
}

export async function extractSwaggerDocumentation(documentRef = globalThis.document, options = {}) {
  const root = documentRef?.querySelector?.("#swagger-ui") ?? documentRef;
  const expansionWarnings = await expandDocumentation(root, options);
  const result = extractRenderedSchemas(documentRef);
  result.warnings.unshift(...expansionWarnings);
  return result;
}
