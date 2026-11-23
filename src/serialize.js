export function buildCatalog(result) {
  const schemas = result.schemas.map((schema) => ({
    ...schema,
    properties: schema.properties.map(stripInternal)
  }));
  return {
    format: "garmin-swagger-schema-catalog",
    formatVersion: 1,
    source: result.source,
    schemas
  };
}

function stripInternal(property) {
  const { children, ...rest } = property;
  return { ...rest, ...(children.length ? { properties: children.map(stripInternal) } : {}) };
}

function walk(properties, visit) {
  for (const property of properties) {
    visit(property);
    walk(property.children ?? property.properties ?? [], visit);
  }
}

export function buildReport(result) {
  const totals = { schemas: result.schemas.length, directProperties: 0, nestedProperties: 0, enums: 0, examples: 0, descriptions: 0, missingDescriptions: 0, missingTypes: 0, collapsedOrMissingEnums: 0, errors: result.warnings.length };
  const schemaSummaries = result.schemas.map((schema) => {
    totals.directProperties += schema.directPropertyCount;
    let nested = 0;
    walk(schema.properties, (property) => {
      if (property.path.split(".").length > 2) nested += 1;
      if (property.enum?.length && property.enumState === "present") totals.enums += 1;
      if (["empty-or-collapsed", "partially-exposed"].includes(property.enumState)) totals.collapsedOrMissingEnums += 1;
      if (property.example !== undefined) totals.examples += 1;
      if (property.description) totals.descriptions += 1;
      else totals.missingDescriptions += 1;
      if (!property.type) totals.missingTypes += 1;
    });
    totals.nestedProperties += nested;
    return { name: schema.name, descriptionAvailable: Boolean(schema.description), directProperties: schema.directPropertyCount, nestedProperties: nested };
  });
  const emptyCapture = result.schemas.length === 0;
  return {
    format: "garmin-swagger-extraction-report",
    formatVersion: 1,
    generatedAt: result.source.capturedAt,
    status: emptyCapture ? "FAILED — NO SCHEMAS FOUND" : result.warnings.length ? "CAPTURED WITH WARNINGS — COMPLETENESS UNVERIFIED" : "CAPTURED — COMPLETENESS UNVERIFIED",
    source: result.source,
    coverage: totals,
    schemas: schemaSummaries,
    errorsAndWarnings: result.warnings,
    limitations: ["Coverage describes only schemas and metadata rendered and expanded in the Swagger UI at capture time.", "Metadata absent from the rendered DOM is marked not-exposed; the extractor does not infer it.", "This report does not assert server-side/API completeness."]
  };
}
