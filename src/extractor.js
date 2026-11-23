/** DOM-only reader for Swagger UI's rendered schema/model documentation. */
const clean = (value) => value?.replace(/\s+/g, " ").trim() ?? "";
const text = (element) => clean(element?.textContent ?? "");

function descriptionIn(element) {
  return text(element?.querySelector(":scope > .renderedMarkdown, :scope > td .renderedMarkdown, .renderedMarkdown, .markdown")) || null;
}

function rowName(row) {
  const firstCell = row.querySelector(":scope > td:first-child");
  const nameNode = firstCell?.querySelector(".prop-name, .property-name, code") ?? firstCell;
  return text(nameNode).replace(/\s*\(\s*\*\s*\)\s*$/, "") || null;
}

function detailCell(row) {
  return row.querySelector(":scope > td:nth-child(2)") ?? row;
}

function parseMetadata(primitive) {
  const metadata = {};
  for (const node of primitive?.querySelectorAll(".prop-format, .prop-constraint, .prop-example, .prop-default, [class*='prop-']") ?? []) {
    if (node.matches(".prop-type, .prop-enum, .prop-name")) continue;
    const raw = text(node);
    const match = raw.match(/^([\w .-]+?):\s*(.+)$/);
    if (match) metadata[clean(match[1]).toLowerCase()] = clean(match[2]);
  }
  return metadata;
}

function exampleValue(primitive, metadata, description) {
  const explicit = primitive?.querySelector(".prop-example, .example");
  if (explicit) return text(explicit) || null;
  const item = Object.entries(metadata).find(([key]) => key === "example");
  if (item) return item[1];
  const exampleLabel = [...(primitive?.querySelectorAll(".prop-format, .property-format, .primitive-details li, dt, dd") ?? [])]
    .find((node) => /^example\s*:?$/i.test(clean(node.textContent)) || /^(?:example)\s*:/i.test(text(node)));
  if (exampleLabel) {
    const candidate = exampleLabel.nextElementSibling ?? exampleLabel.closest("li")?.querySelector("code, samp, .prop-value");
    const value = text(candidate);
    return value.replace(/^example\s*:?\s*/i, "") || null;
  }
  const documentedExample = (description ?? text(primitive?.querySelector(".renderedMarkdown, .markdown")))
    .match(/\bfor example,?\s+([\w.-]+)/i)?.[1];
  if (documentedExample) return documentedExample;
  return null;
}

function enumData(detail) {
  const enumNode = detail.querySelector(".prop-enum");
  if (!enumNode) return { values: [], state: "not-exposed" };
  const values = [...enumNode.querySelectorAll("li, .enum-item, code, [data-value]")]
    .map((node) => clean(node.getAttribute("data-value") ?? node.textContent)).filter(Boolean);
  if (!values.length) {
    const raw = text(enumNode).replace(/^enum\s*:\s*\[\s*/i, "").replace(/\s*\]\s*$/, "");
    if (raw && !/expand|enum values?/i.test(raw)) values.push(...raw.split(/[\n,;]/).map(clean).filter(Boolean));
  }
  if (values.length) {
    values[0] = values[0].replace(/^enum\s*:\s*\[\s*/i, "").trim();
    values[values.length - 1] = values.at(-1).replace(/\s*\]\s*$/, "").trim();
  }
  const collapsed = [...(enumNode?.querySelectorAll("button.model-box-control") ?? [])].some((button) =>
    button.getAttribute("aria-expanded") === "false" || /collapsed/i.test(button.className));
  return { values: [...new Set(values)], state: collapsed ? (values.length ? "partially-exposed" : "empty-or-collapsed") : values.length ? "present" : "empty-or-collapsed" };
}

function objectTableFor(row) {
  const cell = detailCell(row);
  return cell.querySelector(":scope .inner-object table.model, :scope table.model")
    ?? row.querySelector(":scope + tr .inner-object table.model, :scope + tr table.model");
}

function schemaIdentity(model) {
  const titled = model.querySelector(":scope > caption, :scope > thead .model-title, :scope > .model-title, .model-title");
  const raw = text(titled);
  let name = raw.match(/#\/components\/schemas\/([^\s]+)/)?.[1]
    ?? raw.replace(/^.*(?:Schema|Model)\s*:?\s*/i, "").trim();
  const middle = Math.floor(name.length / 2);
  if (name.length % 2 === 0 && name.slice(0, middle) === name.slice(middle)) name = name.slice(0, middle);
  return { name: name.replace(/\s*\(\s*\d+\s*\)\s*$/, "").trim(), raw };
}

function childRows(table) {
  return [...table.querySelectorAll("tr.property-row")].filter((row) => row.closest("table.model") === table);
}

function propertyDetails(row, parentPath, warnings, seenRows = new WeakSet()) {
  if (seenRows.has(row)) {
    warnings.push(`Repeated DOM property row at ${parentPath}; recursion stopped.`);
    return null;
  }
  seenRows.add(row);
  const name = rowName(row);
  const path = name ? `${parentPath}.${name}` : parentPath;
  if (!name) warnings.push(`Property row under ${parentPath} has no readable first-cell name.`);
  const detail = detailCell(row);
  const primitive = detail.querySelector(":scope .property.primitive") ?? detail;
  const typeNode = detail.querySelector(":scope .prop-type");
  const type = text(typeNode) || null;
  const description = descriptionIn(detail);
  const metadata = parseMetadata(primitive);
  const example = exampleValue(primitive, metadata, description);
  const enumeration = enumData(detail);
  if (enumeration.state === "empty-or-collapsed" && detail.querySelector(".prop-enum button.model-box-control")) enumeration.state = "partially-exposed";
  const table = objectTableFor(row);
  const children = table ? childRows(table).map((child) => propertyDetails(child, path, warnings, seenRows)).filter(Boolean) : [];
  const objectDescriptionRow = table?.querySelector(":scope > tbody > tr.description, :scope > tr.description");
  const objectDescription = descriptionIn(objectDescriptionRow) ?? description ?? (objectDescriptionRow ? text(objectDescriptionRow) : null);
  const isObject = Boolean(table || detail.querySelector(":scope .inner-object"));
  const kind = isObject ? "object" : enumeration.values.length ? "enum" : "property";
  return {
    name,
    path,
    kind,
    type,
    description,
    ...(isObject ? { objectDescription } : {}),
    ...(example !== null ? { example } : {}),
    ...(enumeration.values.length ? { enum: enumeration.values } : {}),
    enumState: enumeration.state,
    metadata,
    children,
    availability: {
      description: description ? "present" : "not-exposed",
      example: example !== null ? "present" : "not-exposed",
      enum: enumeration.state,
      type: type ? "present" : "not-exposed",
      metadata: Object.keys(metadata).length ? "present" : "not-exposed"
    }
  };
}

function modelTitle(model) {
  return schemaIdentity(model).name;
}

function schemaFromModel(model, warnings) {
  const name = modelTitle(model);
  if (!name) {
    warnings.push("A rendered table.model had no readable schema title.");
    return null;
  }
  const rows = childRows(model).filter((row) => !row.classList.contains("description"));
  const seenRows = new WeakSet();
  const duplicateNames = new Set();
  const properties = rows.map((row) => propertyDetails(row, name, warnings, seenRows)).filter(Boolean);
  for (const property of properties) {
    if (duplicateNames.has(property.name)) warnings.push(`Duplicate direct property name ${name}.${property.name}.`);
    duplicateNames.add(property.name);
  }
  const descriptionRow = model.querySelector(":scope > tbody > tr.description, :scope > tr.description");
  const identity = schemaIdentity(model);
  return {
    name,
    ...(identity.raw && identity.raw !== name ? { sourceName: identity.raw } : {}),
    description: descriptionIn(descriptionRow) ?? (descriptionRow ? text(descriptionRow) : null),
    properties,
    directPropertyCount: rows.length,
    source: "rendered-swagger-ui-dom"
  };
}

/** Expand only model/enum controls under the schemas container, bounded by pass count. */
async function expandDocumentation(root, { maxPasses = 8, settleMs = 80 } = {}) {
  const warnings = [];
  const limit = Math.max(0, Math.min(20, Number.isInteger(maxPasses) ? maxPasses : 8));
  const controlsSeen = new WeakSet();
  for (let pass = 0; pass < limit; pass += 1) {
    const controls = [...root.querySelectorAll("button.model-box-control, button[aria-expanded='false']")]
      .filter((button) => button.matches(".model-box-control, .prop-enum button"));
    const pending = controls.filter((button) => !controlsSeen.has(button)
      && (button.getAttribute("aria-expanded") === "false" || /collapsed|expand/i.test(`${button.className} ${button.getAttribute("title") ?? ""}`)));
    if (!pending.length) return warnings;
    for (const button of pending) {
      controlsSeen.add(button);
      try { button.click(); } catch { warnings.push("A Swagger documentation expansion control threw while being clicked."); }
    }
    await new Promise((resolve) => globalThis.setTimeout(resolve, Math.max(0, settleMs)));
  }
  const stillCollapsed = [...root.querySelectorAll("button.model-box-control, button[aria-expanded='false']")]
    .some((button) => button.getAttribute("aria-expanded") === "false" || /collapsed|expand/i.test(`${button.className} ${button.getAttribute("title") ?? ""}`));
  if (stillCollapsed) warnings.push(`Some documentation controls remain collapsed after ${limit} expansion passes.`);
  return warnings;
}

export function extractRenderedSchemas(documentRef = globalThis.document) {
  if (!documentRef?.querySelectorAll) throw new TypeError("A browser Document is required.");
  const warnings = [];
  const swagger = documentRef.querySelector("#swagger-ui");
  const modelsPanel = swagger?.querySelector(".models") ?? documentRef.querySelector(".models");
  const root = modelsPanel ?? swagger ?? documentRef;
  const models = [...root.querySelectorAll("table.model")].filter((model) => !model.closest(".inner-object"));
  const schemas = models.map((model) => schemaFromModel(model, warnings)).filter(Boolean);
  if (!swagger) warnings.push("Swagger UI root #swagger-ui was not found. Confirm this is the API documentation page, not a Garmin Developer landing/FAQ page.");
  else if (!modelsPanel) warnings.push("Swagger UI root was found, but the Schemas panel (.models) was not found.");
  if (!models.length) warnings.push("No top-level table.model schema tables were found in the Swagger Schemas panel. Extraction is empty; verify the API Schemas section is rendered and expanded before retrying.");
  const unique = new Map();
  for (const schema of schemas) {
    if (unique.has(schema.name)) warnings.push(`Duplicate rendered schema title: ${schema.name}`);
    else unique.set(schema.name, schema);
  }
  return {
    schemas: [...unique.values()],
    warnings,
    source: {
      method: "rendered-dom",
      pageTitle: documentRef.title || null,
      swaggerUiFound: Boolean(swagger),
      schemasPanelFound: Boolean(modelsPanel),
      modelTableCount: models.length,
      capturedAt: new Date().toISOString()
    }
  };
}

export async function extractSwaggerDocumentation(documentRef = globalThis.document, options = {}) {
  if (!documentRef?.querySelector) throw new TypeError("A browser Document is required.");
  const root = documentRef.querySelector("#swagger-ui .models, .models") ?? documentRef.querySelector("#swagger-ui") ?? documentRef;
  const expansionWarnings = await expandDocumentation(root, options);
  const result = extractRenderedSchemas(documentRef);
  result.warnings.unshift(...expansionWarnings);
  return result;
}
