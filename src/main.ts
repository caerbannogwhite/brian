import "./styles/main.scss";
import { datasetDm, datasetAe } from "./data.ts";
import { MultiDatasetVisualizer } from "./components/MultiDatasetVisualizer";
import { CdiscDataProvider } from "./data/providers/CdiscDataProvider";
import { type CdiscDataset } from "./data/types";

// Initialize the multi-dataset visualizer
async function initMultiDatasetVisualizer() {
  const container = document.getElementById("spreadsheet-container");
  if (!container) return;

  container.style.width = "100%";
  container.style.height = `${window.innerHeight - 50}px`;
  container.style.border = "1px solid #e0e0e0";
  container.style.borderRadius = "4px";
  container.style.overflow = "hidden";

  const multiDatasetVisualizer = new MultiDatasetVisualizer(container, {
    minHeight: 400,
    minWidth: 600,

    // Format options
    dateFormat: "yyyy-MM-dd",
    datetimeFormat: "yyyy-MM-dd HH:mm:ss",
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  });

  // Add the first dataset
  const dataProvider1 = new CdiscDataProvider(datasetDm as CdiscDataset);
  await multiDatasetVisualizer.addDataset("dm", "Demographics", dataProvider1);

  const dataProvider2 = new CdiscDataProvider(datasetAe as CdiscDataset);
  await multiDatasetVisualizer.addDataset("ae", "Adverse Events", dataProvider2);
}

// Start the application
initMultiDatasetVisualizer().catch(console.error);
