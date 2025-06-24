import { SpreadsheetVisualizer } from "../SpreadsheetVisualizer";
import { DataProvider } from "../SpreadsheetVisualizer/types";
import { SpreadsheetOptions } from "../SpreadsheetVisualizer/types";
import { ColumnStatsVisualizer } from "../ColumnStatsVisualizer/ColumnStatsVisualizer";

interface DatasetTab {
  id: string;
  name: string;
  dataProvider: DataProvider;
  spreadsheetVisualizer: SpreadsheetVisualizer;
  container: HTMLElement;
  isActive: boolean;
}

export class MultiDatasetVisualizer {
  private container: HTMLElement;
  private tabsContainer: HTMLElement;
  private contentContainer: HTMLElement;
  private tabs: DatasetTab[] = [];
  private activeTabId: string | null = null;
  private options: SpreadsheetOptions;
  private sharedStatsVisualizer: ColumnStatsVisualizer;

  constructor(parent: HTMLElement, options: SpreadsheetOptions = {}) {
    this.container = document.createElement("div");
    this.container.className = "multi-dataset-visualizer";
    this.options = options;

    // Create tabs container
    this.tabsContainer = document.createElement("div");
    this.tabsContainer.className = "multi-dataset-visualizer__tabs-container";

    // Create content container
    this.contentContainer = document.createElement("div");
    this.contentContainer.className = "multi-dataset-visualizer__content-container";

    this.container.appendChild(this.tabsContainer);
    this.container.appendChild(this.contentContainer);
    parent.appendChild(this.container);

    // Create shared stats visualizer
    this.sharedStatsVisualizer = new ColumnStatsVisualizer(this.container, null, 350);
  }

  public async addDataset(id: string, name: string, dataProvider: DataProvider): Promise<void> {
    // Create a separate container for this dataset's spreadsheet visualizer
    const datasetContainer = document.createElement("div");
    datasetContainer.className = "multi-dataset-visualizer__dataset-container";
    this.contentContainer.appendChild(datasetContainer);

    // Create spreadsheet visualizer for this dataset with shared stats visualizer
    const spreadsheetVisualizer = new SpreadsheetVisualizer(
      datasetContainer, 
      dataProvider, 
      this.options,
      this.sharedStatsVisualizer
    );

    const tab: DatasetTab = {
      id,
      name,
      dataProvider,
      spreadsheetVisualizer,
      container: datasetContainer,
      isActive: false,
    };

    this.tabs.push(tab);
    this.createTabElement(tab);

    // Initialize the spreadsheet
    await spreadsheetVisualizer.initialize();

    // If this is the first tab, activate it
    if (this.tabs.length === 1) {
      this.activateTab(id);
    }
  }

  public async switchToDataset(id: string): Promise<void> {
    const tab = this.tabs.find((t) => t.id === id);
    if (tab) {
      this.activateTab(id);
    }
  }

  public closeDataset(id: string): void {
    const tabIndex = this.tabs.findIndex((t) => t.id === id);
    if (tabIndex === -1) return;

    const tab = this.tabs[tabIndex];

    // Remove tab element
    const tabElement = this.tabsContainer.querySelector(`[data-tab-id="${id}"]`);
    if (tabElement) {
      tabElement.remove();
    }

    // Remove dataset container from DOM
    tab.container.remove();

    // Remove from tabs array
    this.tabs.splice(tabIndex, 1);

    // If this was the active tab, switch to another tab
    if (tab.isActive) {
      if (this.tabs.length > 0) {
        const newActiveTab = tabIndex < this.tabs.length ? this.tabs[tabIndex] : this.tabs[tabIndex - 1];
        this.activateTab(newActiveTab.id);
      } else {
        this.activeTabId = null;
        this.contentContainer.innerHTML = "";
        // Hide stats visualizer when no datasets are active
        this.sharedStatsVisualizer.hide();
      }
    }

    // Clean up spreadsheet visualizer
    // Note: You might want to add a cleanup method to SpreadsheetVisualizer
  }

  public getActiveDatasetId(): string | null {
    return this.activeTabId;
  }

  public getDatasetIds(): string[] {
    return this.tabs.map((t) => t.id);
  }

  private createTabElement(tab: DatasetTab): void {
    const tabElement = document.createElement("div");
    tabElement.setAttribute("data-tab-id", tab.id);
    tabElement.className = "multi-dataset-visualizer__tab";

    // Tab title
    const titleElement = document.createElement("span");
    titleElement.textContent = tab.name;
    titleElement.className = "multi-dataset-visualizer__tab-title";

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.className = "multi-dataset-visualizer__tab-close";

    // Event listeners
    tabElement.addEventListener("click", (e) => {
      if (e.target !== closeButton) {
        this.activateTab(tab.id);
      }
    });

    closeButton.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closeDataset(tab.id);
    });

    tabElement.appendChild(titleElement);
    tabElement.appendChild(closeButton);
    this.tabsContainer.appendChild(tabElement);
  }

  private async activateTab(id: string): Promise<void> {
    // Deactivate current tab
    if (this.activeTabId) {
      const currentTab = this.tabs.find((t) => t.id === this.activeTabId);
      if (currentTab) {
        currentTab.isActive = false;
        currentTab.container.classList.remove("multi-dataset-visualizer__dataset-container--active");
        this.updateTabStyles(this.activeTabId, false);
      }
    }

    // Activate new tab
    const newTab = this.tabs.find((t) => t.id === id);
    if (newTab) {
      newTab.isActive = true;
      this.activeTabId = id;
      newTab.container.classList.add("multi-dataset-visualizer__dataset-container--active");
      this.updateTabStyles(id, true);
      
      // Update the data provider for the shared stats visualizer
      this.sharedStatsVisualizer.setDataProvider(newTab.dataProvider);
    }
  }

  private updateTabStyles(tabId: string, isActive: boolean): void {
    const tabElement = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
    if (tabElement) {
      if (isActive) {
        tabElement.classList.add("multi-dataset-visualizer__tab--active");
      } else {
        tabElement.classList.remove("multi-dataset-visualizer__tab--active");
      }
    }
  }
}
