import "./styles/main.scss";
import { datasetDm, datasetAe } from "./data.ts";
import { BrianApp } from "./components/BrianApp";
import { type CdiscDataset } from "./data/types";

// Initialize the Brian application with VS Code-like interface
async function initApplication() {
  const appContainer = document.getElementById("app") || document.body;

  // Clear existing content
  appContainer.innerHTML = '';

  // Create the Brian application
  const brianApp = new BrianApp(appContainer, {
    theme: 'auto', // Automatically detect user's preferred theme
    showDatasetPanel: true,
    statusBarVisible: true,
    commandPaletteEnabled: true,
    spreadsheetOptions: {
      minHeight: 400,
      minWidth: 600,
      dateFormat: "yyyy-MM-dd",
      datetimeFormat: "yyyy-MM-dd HH:mm:ss",
      numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    }
  });

  // Load sample datasets
  try {
    await brianApp.addDataset("dm", "Demographics", datasetDm as CdiscDataset);
    await brianApp.addDataset("ae", "Adverse Events", datasetAe as CdiscDataset);
    
    brianApp.showMessage("Sample datasets loaded successfully", "info");
  } catch (error) {
    console.error("Error loading datasets:", error);
    brianApp.showMessage("Error loading sample datasets", "error");
  }

  // Make brianApp globally available for debugging
  (window as any).brianApp = brianApp;

  console.log("Brian application initialized with VS Code-like interface");
  console.log("- Press Ctrl+P to open the command palette");
  console.log("- Press F11 to toggle fullscreen");
  console.log("- Access 'brianApp' from the console for debugging");
}

// Start the application
initApplication().catch(console.error);
