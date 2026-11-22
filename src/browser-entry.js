import { extractSwaggerDocumentation } from "./extractor.js";
import { buildCatalog, buildReport } from "./serialize.js";

function downloadJson(filename, value) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

void (async () => {
  try {
    const result = await extractSwaggerDocumentation(document);
    downloadJson("garmin-schema-catalog.json", buildCatalog(result));
    downloadJson("garmin-extraction-report.json", buildReport(result));
    console.info("Garmin Swagger documentation extracted", buildReport(result).coverage);
  } catch (error) {
    console.error("Garmin Swagger documentation extraction failed", error);
  }
})();
