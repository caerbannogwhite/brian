import { MultiDatasetVisualizer } from "../MultiDatasetVisualizer";
import { DatasetPanel } from "../DatasetPanel";
import { StatusBar } from "../StatusBar";
import { CommandPalette } from "../CommandPalette";
import { SpreadsheetOptions } from "../SpreadsheetVisualizer/types";
import { CdiscDataset } from "../../data/types";
import { CdiscDataProvider } from "../../data/providers/CdiscDataProvider";

export interface BrianAppOptions {
  spreadsheetOptions?: SpreadsheetOptions;
  theme?: "light" | "dark" | "auto";
  showDatasetPanel?: boolean;
  statusBarVisible?: boolean;
  commandPaletteEnabled?: boolean;
}

export class BrianApp {
  private container: HTMLElement;
  private statusBar!: StatusBar;
  private commandPalette!: CommandPalette;
  private mainContainer!: HTMLElement;
  private datasetPanelContainer!: HTMLElement;
  private spreadsheetContainer!: HTMLElement;
  private multiDatasetVisualizer!: MultiDatasetVisualizer;
  private datasetPanel!: DatasetPanel;
  private options: BrianAppOptions;
  private theme: "light" | "dark" = "dark";

  constructor(parent: HTMLElement, options: BrianAppOptions = {}) {
    this.options = {
      theme: "dark",
      showDatasetPanel: true,
      statusBarVisible: true,
      commandPaletteEnabled: true,
      ...options,
    };

    this.container = document.createElement("div");
    this.container.className = "brian-app";
    this.setupTheme();

    this.createLayout();
    this.setupComponents();
    this.registerCommands();
    this.setupEventListeners();

    parent.appendChild(this.container);
  }

  private createLayout(): void {
    // Main container (excluding status bar)
    this.mainContainer = document.createElement("div");
    this.mainContainer.className = "brian-app__main";

    // Dataset panel container
    this.datasetPanelContainer = document.createElement("div");
    this.datasetPanelContainer.className = "brian-app__dataset-panel";

    // Spreadsheet container
    this.spreadsheetContainer = document.createElement("div");
    this.spreadsheetContainer.className = "brian-app__spreadsheet";

    this.mainContainer.appendChild(this.datasetPanelContainer);
    this.mainContainer.appendChild(this.spreadsheetContainer);
    this.container.appendChild(this.mainContainer);
  }

  private setupComponents(): void {
    // Status bar
    if (this.options.statusBarVisible) {
      this.statusBar = new StatusBar(this.container);
      this.statusBar.setOnCommandCallback((command) => this.executeCommand(command));
    }

    // Command palette
    if (this.options.commandPaletteEnabled) {
      this.commandPalette = new CommandPalette(this.container);
    }

    // Calculate dimensions
    this.updateDimensions();

    // Multi-dataset visualizer
    this.multiDatasetVisualizer = new MultiDatasetVisualizer(this.spreadsheetContainer, this.options.spreadsheetOptions);

    // Dataset panel
    if (this.options.showDatasetPanel) {
      this.datasetPanel = new DatasetPanel(this.datasetPanelContainer, this.multiDatasetVisualizer);

      // Handle panel toggle
      this.datasetPanel.setOnToggleCallback((isMinimized) => {
        this.container.classList.toggle("brian-app--panel-minimized", isMinimized);
        this.updateDimensions();
      });
    }

    // Listen for dataset changes
    this.setupDatasetListeners();
    
    // Setup file drop handling
    this.setupFileDropHandling();
  }

  private setupTheme(): void {
    this.theme = this.options.theme === "auto" ? this.detectTheme() : this.options.theme || "dark";
    this.container.classList.add(`brian-app--${this.theme}`);
    document.body.classList.add(`theme-${this.theme}`);
  }

  private detectTheme(): "light" | "dark" {
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }
    return "light";
  }

  private setupEventListeners(): void {
    // Window resize
    window.addEventListener("resize", () => this.updateDimensions());

    // Theme change detection
    if (this.options.theme === "auto") {
      window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
        this.setTheme(e.matches ? "dark" : "light");
      });
    }

    // Global keyboard shortcuts
    document.addEventListener("keydown", (e) => this.handleGlobalKeyboard(e));
  }

  private handleGlobalKeyboard(e: KeyboardEvent): void {
    // Ctrl+Shift+P for command palette (if Ctrl+P is taken by browser)
    if (e.ctrlKey && e.shiftKey && e.key === "P") {
      e.preventDefault();
      this.commandPalette?.show();
    }

    // F11 for fullscreen
    if (e.key === "F11") {
      e.preventDefault();
      this.toggleFullscreen();
    }
  }

  private updateDimensions(): void {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const statusBarHeight = this.options.statusBarVisible ? 22 : 0;
    const panelWidth = this.options.showDatasetPanel ? (this.datasetPanel?.getIsMinimized() ? 48 : 280) : 0;

    // Update main container
    this.mainContainer.style.height = `${windowHeight - statusBarHeight}px`;
    this.mainContainer.style.paddingBottom = `${statusBarHeight}px`;

    // Update spreadsheet container
    const contentWidth = windowWidth - panelWidth;
    this.spreadsheetContainer.style.width = `${contentWidth}px`;
    this.spreadsheetContainer.style.height = `${windowHeight - statusBarHeight}px`;

    // Trigger resize on the multi-dataset visualizer to update the active spreadsheet
    if (this.multiDatasetVisualizer) {
      this.multiDatasetVisualizer.resize().catch(console.error);
    }
  }

  private setupDatasetListeners(): void {
    // Override closeDataset to update panel state
    const originalCloseDataset = this.multiDatasetVisualizer.closeDataset.bind(this.multiDatasetVisualizer);
    this.multiDatasetVisualizer.closeDataset = (id: string) => {
      originalCloseDataset(id);
      this.datasetPanel?.markDatasetAsUnloaded(id);
      this.updateStatusBarDatasetInfo();
    };

    // Listen for dataset switches (this would require extending MultiDatasetVisualizer)
    // For now, we'll update status bar when datasets are added
  }

  private registerCommands(): void {
    if (!this.commandPalette) return;

    // View commands
    this.commandPalette.registerCommand({
      id: "view.toggleDatasetPanel",
      title: "Toggle Dataset Panel",
      description: "Show or hide the dataset panel",
      category: "View",
      execute: () => this.toggleDatasetPanel(),
    });

    this.commandPalette.registerCommand({
      id: "view.toggleTheme",
      title: "Toggle Theme",
      description: "Switch between light and dark themes",
      category: "View",
      execute: () => this.toggleTheme(),
    });

    // Dataset commands
    this.commandPalette.registerCommand({
      id: "dataset.export",
      title: "Export Current Dataset",
      description: "Export the currently active dataset",
      category: "Dataset",
      when: () => this.multiDatasetVisualizer.getActiveDatasetId() !== null,
      execute: () => this.exportCurrentDataset(),
    });

    this.commandPalette.registerCommand({
      id: "dataset.closeAll",
      title: "Close All Datasets",
      description: "Close all open datasets",
      category: "Dataset",
      when: () => this.multiDatasetVisualizer.getDatasetIds().length > 0,
      execute: () => this.closeAllDatasets(),
    });

    // Developer commands
    this.commandPalette.registerCommand({
      id: "developer.showInfo",
      title: "Show Application Info",
      description: "Display information about the current application state",
      category: "Developer",
      execute: () => this.showApplicationInfo(),
    });
  }

  private async executeCommand(command: string): Promise<void> {
    switch (command) {
      case "workbench.action.showCommands":
        this.commandPalette?.show();
        break;

      case "dataset.export":
        this.exportCurrentDataset();
        break;

      default:
        console.warn("Unknown command:", command);
    }
  }

  private toggleDatasetPanel(): void {
    this.datasetPanel.toggleMinimize();
  }

  private toggleTheme(): void {
    this.setTheme(this.theme === "light" ? "dark" : "light");
    this.showMessage(`Switched to ${this.theme} theme`, "info");
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  private exportCurrentDataset(): void {
    const activeId = this.multiDatasetVisualizer.getActiveDatasetId();
    if (activeId) {
      // TODO: Implement dataset export functionality
      this.showMessage(`Export functionality for dataset ${activeId} not implemented yet`, "info");
    } else {
      this.showMessage("No active dataset to export", "warning");
    }
  }

  private closeAllDatasets(): void {
    const datasetIds = this.multiDatasetVisualizer.getDatasetIds();
    datasetIds.forEach((id) => this.multiDatasetVisualizer.closeDataset(id));
    this.showMessage("All datasets closed", "info");
  }

  private showApplicationInfo(): void {
    const datasetIds = this.multiDatasetVisualizer.getDatasetIds();
    const info = `
    Brian Application Info:
    - Active datasets: ${datasetIds.length}
    - Theme: ${this.theme}
    - Dataset panel: ${this.options.showDatasetPanel ? "visible" : "hidden"}
    - Status bar: ${this.options.statusBarVisible ? "visible" : "hidden"}
    - Command palette: ${this.options.commandPaletteEnabled ? "enabled" : "disabled"}
    `.trim();

    console.log(info);
    this.showMessage("Application info logged to console", "info");
  }

  private updateStatusBarDatasetInfo(): void {
    const activeId = this.multiDatasetVisualizer.getActiveDatasetId();
    if (activeId && this.statusBar) {
      // TODO: Get actual dataset info from the visualizer
      this.statusBar.updateDatasetInfo(activeId, 0, 0);
    }
  }

  private setupFileDropHandling(): void {
    this.multiDatasetVisualizer.setOnFileDroppedCallback(async (dataset: CdiscDataset, fileName: string) => {
      try {
        // Generate a unique ID for the dataset
        const datasetId = dataset.name.toLowerCase();
        
        // Add to dataset panel first
        this.datasetPanel.addDataset(datasetId, datasetId, dataset.label || dataset.name, dataset);
        
        // Create data provider and add to visualizer
        const dataProvider = new CdiscDataProvider(dataset);
        await this.multiDatasetVisualizer.addDataset(datasetId, dataset.label || dataset.name, dataProvider);
        
        // Mark as loaded in panel
        this.datasetPanel.markDatasetAsLoaded(datasetId);
        
        // Update status bar
        this.updateStatusBarDatasetInfo();
        
        // Show success message
        this.showMessage(`Dataset "${fileName}" loaded successfully`, "info");
        
      } catch (error) {
        console.error("Error adding dropped dataset:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        this.showMessage(`Failed to load dataset: ${errorMessage}`, "error");
      }
    });
  }

  // Public API methods
  public async addDataset(id: string, name: string, dataset: CdiscDataset): Promise<void> {
    this.datasetPanel.addDataset(id, id, name, dataset);
    this.updateStatusBarDatasetInfo();
  }

  public setTheme(theme: "light" | "dark"): void {
    this.container.classList.remove(`brian-app--${this.theme}`);
    document.body.classList.remove(`theme-${this.theme}`);

    this.theme = theme;
    this.container.classList.add(`brian-app--${this.theme}`);
    document.body.classList.add(`theme-${this.theme}`);
  }

  public showMessage(message: string, type: "info" | "warning" | "error" = "info"): void {
    this.statusBar?.showMessage(message, type);
  }

  public destroy(): void {
    this.statusBar?.destroy();
    this.commandPalette?.destroy();
    this.container.remove();
  }
}
