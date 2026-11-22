import { writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

function parseArgs(args) {
  const options = { output: "garmin-schema-catalog.json", report: "garmin-extraction-report.json" };
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--output") options.output = args[++i];
    else if (args[i] === "--report") options.report = args[++i];
    else throw new Error(`Unknown option: ${args[i]}`);
  }
  return options;
}

export async function saveExtraction(result, options) {
  const { buildCatalog, buildReport } = await import("./serialize.js");
  const catalog = buildCatalog(result);
  const report = buildReport(result);
  await writeFile(options.output, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  await writeFile(options.report, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return report;
}

export async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (typeof document === "undefined") {
    throw new Error("This command must be pasted into the browser DevTools console on the already-open Swagger UI page. It cannot run in Node.js because it requires the rendered page DOM.");
  }
  const { extractSwaggerDocumentation } = await import("./extractor.js");
  const result = await extractSwaggerDocumentation(document);
  const report = await saveExtraction(result, options);
  console.info("Swagger documentation extraction complete", report.coverage);
  return { catalog: options.output, report: options.report };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
