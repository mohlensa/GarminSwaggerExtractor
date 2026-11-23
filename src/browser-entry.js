import { extractSwaggerDocumentation } from "./extractor.js";
import { buildCatalog, buildReport } from "./serialize.js";

function downloadJson(filename, value) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  globalThis.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

void (async () => {
  try {
    const result = await extractSwaggerDocumentation(document);
    downloadJson("garmin-schema-catalog.json", buildCatalog(result));
    downloadJson("garmin-extraction-report.json", buildReport(result));
    const report = buildReport(result);
    const log = result.schemas.length ? console.info : console.error;
    log("Garmin Swagger documentation extraction", report.status, report.source, report.coverage, report.errorsAndWarnings);
  } catch (error) {
    console.error("Garmin Swagger documentation extraction failed", error);
  }
})();
