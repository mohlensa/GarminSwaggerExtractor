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

export function validateCatalog(catalog) {
  const split = catalog.schemas.find((schema) => schema.name === "SplitSummaryDTO");
  if (!split) return { status: "BLOCKED", checked: ["SplitSummaryDTO"], discrepancies: ["SplitSummaryDTO is absent from the supplied catalog."] };
  const discrepancies = [];
  if (split.directPropertyCount !== reference.SplitSummaryDTO.directPropertyCount) {
    discrepancies.push(`SplitSummaryDTO direct properties: expected ${reference.SplitSummaryDTO.directPropertyCount}, observed ${split.directPropertyCount}.`);
  }
  const maxGrade = findPath(split.properties, "maxGradeValue");
  if (!maxGrade) discrepancies.push("maxGradeValue inline object was not found.");
  else {
    if (maxGrade.description !== reference.maxGradeValue.description) discrepancies.push("maxGradeValue description did not match the manual reference.");
    for (const [name, expected] of Object.entries(reference.maxGradeValue.properties)) {
      const actual = findPath(maxGrade.properties ?? maxGrade.children, name);
      if (!actual) { discrepancies.push(`maxGradeValue.${name} was not found.`); continue; }
      if (actual.type !== expected.type) discrepancies.push(`maxGradeValue.${name} type mismatch.`);
      if (expected.example !== undefined && actual.example !== expected.example) discrepancies.push(`maxGradeValue.${name} example mismatch.`);
      if (expected.enum && JSON.stringify(actual.enum) !== JSON.stringify(expected.enum)) discrepancies.push("maxGradeValue.scale enum values/order mismatch.");
    }
  }
  return { status: discrepancies.length ? "FAIL" : "PASS", checked: ["SplitSummaryDTO direct property count", "maxGradeValue object and description", "valueKey type/example", "scale type/12 enum values"], discrepancies };
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
