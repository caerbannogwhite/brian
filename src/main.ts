import "./styles/main.scss";
import { datasetDm, datasetAe } from "./data.ts";
import { MultiDatasetVisualizer } from "./components/MultiDatasetVisualizer";
import { DatasetPanel } from "./components/DatasetPanel";
import { type CdiscDataset } from "./data/types";

// Initialize the application with dataset panel and multi-dataset visualizer
async function initApplication() {
  const spreadsheetContainer = document.getElementById("spreadsheet-container");
  const datasetPanelContainer = document.getElementById("dataset-panel-container");
  const mainContent = document.getElementById("main-content");

  if (!spreadsheetContainer || !datasetPanelContainer || !mainContent) return;

  // Calculate dimensions accounting for the dataset panel
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const panelWidth = 280; // Default panel width

  // Set up the spreadsheet container dimensions
  const contentWidth = windowWidth - panelWidth;
  spreadsheetContainer.style.width = `${contentWidth}px`;
  spreadsheetContainer.style.height = `${windowHeight - 50}px`;
  spreadsheetContainer.style.border = "1px solid #e0e0e0";
  spreadsheetContainer.style.borderRadius = "4px";
  spreadsheetContainer.style.overflow = "hidden";
  spreadsheetContainer.style.position = "relative";

  // Force a layout calculation
  spreadsheetContainer.offsetHeight;

  // Get actual computed dimensions
  const containerRect = spreadsheetContainer.getBoundingClientRect();
  const actualWidth = Math.floor(containerRect.width);
  const actualHeight = Math.floor(containerRect.height);

  // Create the multi-dataset visualizer
  const multiDatasetVisualizer = new MultiDatasetVisualizer(spreadsheetContainer, {
    width: actualWidth,
    height: actualHeight,
    minHeight: 400,
    minWidth: 600,
    dateFormat: "yyyy-MM-dd",
    datetimeFormat: "yyyy-MM-dd HH:mm:ss",
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  });

  // Create the dataset panel
  const datasetPanel = new DatasetPanel(datasetPanelContainer, multiDatasetVisualizer);

  // Add available datasets to the panel
  datasetPanel.addDataset("ae", "ae", "Adverse Events", datasetAe as CdiscDataset);
  datasetPanel.addDataset("dm", "dm", "Demographics", datasetDm as CdiscDataset);

  // Listen for dataset close events to update panel state
  const originalCloseDataset = multiDatasetVisualizer.closeDataset.bind(multiDatasetVisualizer);
  multiDatasetVisualizer.closeDataset = function (id: string) {
    originalCloseDataset(id);
    datasetPanel.markDatasetAsUnloaded(id);
  };

  // Handle panel minimize/maximize to adjust main content margin
  datasetPanel.setOnToggleCallback((isMinimized: boolean) => {
    if (isMinimized) {
      mainContent.classList.add("main-content--panel-minimized");
      const newContentWidth = window.innerWidth - 48; // Minimized panel width
      spreadsheetContainer.style.width = `${newContentWidth}px`;
    } else {
      mainContent.classList.remove("main-content--panel-minimized");
      const newContentWidth = window.innerWidth - 280; // Full panel width
      spreadsheetContainer.style.width = `${newContentWidth}px`;
    }
  });

  // Handle window resize
  window.addEventListener("resize", () => {
    const newWidth = window.innerWidth;
    const newHeight = window.innerHeight - 50;
    const isMinimized = datasetPanel.getIsMinimized();
    const panelCurrentWidth = isMinimized ? 48 : 280;
    const newContentWidth = newWidth - panelCurrentWidth;

    spreadsheetContainer.style.width = `${newContentWidth}px`;
    spreadsheetContainer.style.height = `${newHeight}px`;
  });
}

// Start the application
initApplication().catch(console.error);
