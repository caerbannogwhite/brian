import { datasetDm } from "./data.ts";
import { SpreadsheetVisualizer } from "./components/SpreadsheetVisualizer";
import { CdiscDataProvider } from "./data/providers/CdiscDataProvider";
import { type CdiscDataset } from "./data/types";

// Initialize the spreadsheet
async function initSpreadsheet() {
  const container = document.getElementById("spreadsheet-container");
  if (!container) return;

  container.style.width = "100%";
  container.style.height = `${window.innerHeight - 50}px`;
  container.style.border = "1px solid #e0e0e0";
  container.style.borderRadius = "4px";
  container.style.overflow = "hidden";

  const dataProvider = new CdiscDataProvider(datasetDm as CdiscDataset);

  const spreadsheetVisualizer = new SpreadsheetVisualizer(container, dataProvider, {
    minHeight: 400,
    minWidth: 600,

    // Format options
    dateFormat: "yyyy-MM-dd",
    datetimeFormat: "yyyy-MM-dd HH:mm:ss",
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  });

  await spreadsheetVisualizer.initialize();
}

// Start the application
initSpreadsheet().catch(console.error);
