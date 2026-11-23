import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const reference = {
  SplitSummaryDTO: { directPropertyCount: 225 },
  maxGradeValue: {
    description: "Maximum grade value and its grading scale for the split.",
    properties: {
      valueKey: { type: "string", example: "_5_1" },
      scale: { type: "string", enum: ["YDS", "UIAA", "FRENCH", "BRITISH_ADJECTIVAL", "BRITISH_TECHNICAL", "EWBANK", "BRAZILIAN", "SAXON", "VERMIN", "FONT", "DANKYU", "YDS_PM"] }
    }
  }
};

function findPath(properties, path) {
  for (const property of properties ?? []) {
    if (property.path?.endsWith(`.${path}`) || property.name === path) return property;
    const found = findPath(property.properties ?? property.children, path);
    if (found) return found;
  }
  return null;
}

function findSplitSummary(catalog) {
  for (const schema of catalog?.schemas ?? []) {
    const candidates = [schema, ...flatten(schema.properties)];
    const match = candidates.find((property) => property.name === "splitSummaries" && property.kind === "object");
    if (match) return { schema, object: match };
    if (schema.name === "SplitSummaryDTO") return { schema, object: schema };
  }
  return null;
}

function flatten(properties) {
  return (properties ?? []).flatMap((property) => [property, ...flatten(property.properties ?? property.children)]);
}

export function validateCatalog(catalog) {
  const found = findSplitSummary(catalog);
  const split = found?.object;
  if (!split) return { status: "NOT VERIFIABLE", checks: [{ name: "SplitSummaryDTO/splitSummaries", status: "NOT VERIFIABLE", reason: "Neither a SplitSummaryDTO schema nor a splitSummaries inline object is present in the supplied catalog." }], discrepancies: [] };
  const checks = [];
  const directPropertyCount = split.directPropertyCount ?? split.properties?.length ?? split.children?.length;
  checks.push(directPropertyCount === reference.SplitSummaryDTO.directPropertyCount
    ? { name: "direct property count", status: "PASS", expected: 225, observed: directPropertyCount }
    : directPropertyCount === undefined
      ? { name: "direct property count", status: "NOT VERIFIABLE", expected: 225, reason: "Direct property count is unavailable." }
      : { name: "direct property count", status: "FAIL", expected: 225, observed: directPropertyCount });
  const maxGrade = findPath(split.properties ?? split.children, "maxGradeValue");
  if (!maxGrade) checks.push({ name: "maxGradeValue", status: "NOT VERIFIABLE", reason: "Inline object is absent or not exposed." });
  else {
    const objectDescription = maxGrade.objectDescription ?? maxGrade.description;
    checks.push(objectDescription?.replace(/[.!]$/, "") === reference.maxGradeValue.description.replace(/[.!]$/, "")
      ? { name: "maxGradeValue description", status: "PASS" }
      : objectDescription
        ? { name: "maxGradeValue description", status: "FAIL", observed: objectDescription }
        : { name: "maxGradeValue description", status: "NOT VERIFIABLE", reason: "Object description is not exposed." });
    for (const [name, expected] of Object.entries(reference.maxGradeValue.properties)) {
      const actual = findPath(maxGrade.properties ?? maxGrade.children, name);
      if (!actual) { checks.push({ name: `maxGradeValue.${name}`, status: "NOT VERIFIABLE", reason: "Property is absent or not exposed." }); continue; }
      const fields = ["type", ...(expected.example !== undefined ? ["example"] : []), ...(expected.enum ? ["enum"] : []), ...(expected.description ? ["description"] : [])];
      for (const field of fields) {
        if (field === "example" && actual[field] == null && actual.description?.match(/\bfor example,?\s+([\w.-]+)/i)?.[1]) {
          const observed = actual.description.match(/\bfor example,?\s+([\w.-]+)/i)[1];
          checks.push({ name: `maxGradeValue.${name}.${field}`, status: observed === expected[field] ? "PASS" : "FAIL", ...(observed === expected[field] ? {} : { expected: expected[field], observed }) });
        } else if (actual[field] === undefined || actual[field] === null) checks.push({ name: `maxGradeValue.${name}.${field}`, status: "NOT VERIFIABLE", reason: "Metadata is not exposed." });
        else {
          const matches = JSON.stringify(actual[field]) === JSON.stringify(expected[field]);
          checks.push({ name: `maxGradeValue.${name}.${field}`, status: matches ? "PASS" : "FAIL", ...(matches ? {} : { expected: expected[field], observed: actual[field] }) });
        }
      }
    }
  }
  const statuses = checks.map(({ status }) => status);
  const status = statuses.includes("FAIL") ? "FAIL" : statuses.includes("NOT VERIFIABLE") ? "NOT VERIFIABLE" : "PASS";
  return { status, checks, discrepancies: checks.filter(({ status: state }) => state === "FAIL") };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  try {
    const input = process.argv[2];
    if (!input) throw new Error("Usage: npm run validate -- <catalog.json>");
    const result = validateCatalog(JSON.parse(await readFile(input, "utf8")));
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== "PASS") process.exitCode = 1;
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
