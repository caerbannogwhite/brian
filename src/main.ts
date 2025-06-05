import { datasetDm } from "./data";
import { SpreadsheetVisualizer } from "./components/SpreadsheetVisualizer";
import { CdiscDataProvider } from "./data/providers/CdiscDataProvider";
import { getColumns, type CdiscDataset } from "./data/types";

// Initialize the spreadsheet
async function initSpreadsheet() {
  const container = document.getElementById("spreadsheet-container");
  if (!container) return;

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const dataProvider = new CdiscDataProvider(datasetDm as CdiscDataset);

  const spreadsheetVisualizer = new SpreadsheetVisualizer(canvas, dataProvider, {
    // Viewport options
    maxHeight: 800,
    maxWidth: 1200,
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
