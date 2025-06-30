import "./styles/main.scss";
import { datasetDm, datasetAe } from "./data.ts";
import { MultiDatasetVisualizer } from "./components/MultiDatasetVisualizer";
import { CdiscDataProvider } from "./data/providers/CdiscDataProvider";
import { type CdiscDataset } from "./data/types";

// Initialize the multi-dataset visualizer
async function initMultiDatasetVisualizer() {
  const container = document.getElementById("spreadsheet-container");
  if (!container) return;

  // First, set up the container with explicit pixel dimensions
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  container.style.width = `${windowWidth}px`;
  container.style.height = `${windowHeight - 50}px`;
  container.style.border = "1px solid #e0e0e0";
  container.style.borderRadius = "4px";
  container.style.overflow = "hidden";
  container.style.position = "relative"; // Ensure proper positioning context

  // Force a layout calculation to ensure the container dimensions are applied
  container.offsetHeight; // This forces a reflow

  // Now get the actual computed dimensions
  const containerRect = container.getBoundingClientRect();
  const actualWidth = Math.floor(containerRect.width);
  const actualHeight = Math.floor(containerRect.height);

  // Create the multi-dataset visualizer with explicit dimensions
  const multiDatasetVisualizer = new MultiDatasetVisualizer(container, {
    width: actualWidth,
    height: actualHeight,
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

  // Handle window resize to update container dimensions
  window.addEventListener("resize", () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight - 50;

    container.style.width = `${newWidth}px`;
    container.style.height = `${newHeight}px`;
  });
}

// Start the application
initMultiDatasetVisualizer().catch(console.error);
