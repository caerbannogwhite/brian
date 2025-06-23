import { SpreadsheetVisualizer } from "../SpreadsheetVisualizer";
import { DataProvider } from "../SpreadsheetVisualizer/types";
import { SpreadsheetOptions } from "../SpreadsheetVisualizer/types";

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

  constructor(parent: HTMLElement, options: SpreadsheetOptions = {}) {
    this.container = document.createElement("div");
    this.options = options;

    this.container.style.display = "flex";
    this.container.style.flexDirection = "column";
    this.container.style.height = "100%";
    this.container.style.width = "100%";
    this.container.style.overflow = "hidden";

    // Create tabs container
    this.tabsContainer = document.createElement("div");
    this.tabsContainer.style.display = "flex";
    this.tabsContainer.style.backgroundColor = "#f5f5f5";
    this.tabsContainer.style.borderBottom = "1px solid #ddd";
    this.tabsContainer.style.overflowX = "auto";
    this.tabsContainer.style.overflowY = "hidden";
    this.tabsContainer.style.minHeight = "40px";
    this.tabsContainer.style.maxHeight = "40px";

    // Create content container
    this.contentContainer = document.createElement("div");
    this.contentContainer.style.flex = "1";
    this.contentContainer.style.overflow = "hidden";
    this.contentContainer.style.position = "relative";

    this.container.appendChild(this.tabsContainer);
    this.container.appendChild(this.contentContainer);
    parent.appendChild(this.container);
  }

  public async addDataset(id: string, name: string, dataProvider: DataProvider): Promise<void> {
    // Create a separate container for this dataset's spreadsheet visualizer
    const datasetContainer = document.createElement("div");
    datasetContainer.style.width = "100%";
    datasetContainer.style.height = "100%";
    datasetContainer.style.display = "none"; // Initially hidden
    this.contentContainer.appendChild(datasetContainer);

    // Create spreadsheet visualizer for this dataset
    const spreadsheetVisualizer = new SpreadsheetVisualizer(datasetContainer, dataProvider, this.options);

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
    tabElement.style.display = "flex";
    tabElement.style.alignItems = "center";
    tabElement.style.padding = "8px 16px";
    tabElement.style.backgroundColor = "#e0e0e0";
    tabElement.style.borderRight = "1px solid #ccc";
    tabElement.style.cursor = "pointer";
    tabElement.style.userSelect = "none";
    tabElement.style.minWidth = "120px";
    tabElement.style.maxWidth = "200px";
    tabElement.style.position = "relative";
    tabElement.style.transition = "background-color 0.2s ease";

    // Tab title
    const titleElement = document.createElement("span");
    titleElement.textContent = tab.name;
    titleElement.style.flex = "1";
    titleElement.style.overflow = "hidden";
    titleElement.style.textOverflow = "ellipsis";
    titleElement.style.whiteSpace = "nowrap";
    titleElement.style.fontSize = "14px";

    // Close button
    const closeButton = document.createElement("button");
    closeButton.innerHTML = "×";
    closeButton.style.background = "none";
    closeButton.style.border = "none";
    closeButton.style.fontSize = "16px";
    closeButton.style.fontWeight = "bold";
    closeButton.style.cursor = "pointer";
    closeButton.style.marginLeft = "8px";
    closeButton.style.padding = "0";
    closeButton.style.width = "16px";
    closeButton.style.height = "16px";
    closeButton.style.display = "flex";
    closeButton.style.alignItems = "center";
    closeButton.style.justifyContent = "center";
    closeButton.style.color = "#666";
    closeButton.style.borderRadius = "2px";

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

    closeButton.addEventListener("mouseenter", () => {
      closeButton.style.backgroundColor = "#ff4444";
      closeButton.style.color = "white";
    });

    closeButton.addEventListener("mouseleave", () => {
      closeButton.style.backgroundColor = "transparent";
      closeButton.style.color = "#666";
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
        currentTab.container.style.display = "none";
        this.updateTabStyles(this.activeTabId, false);
      }
    }

    // Activate new tab
    const newTab = this.tabs.find((t) => t.id === id);
    if (newTab) {
      newTab.isActive = true;
      this.activeTabId = id;
      newTab.container.style.display = "block";
      this.updateTabStyles(id, true);
    }
  }

  private updateTabStyles(tabId: string, isActive: boolean): void {
    const tabElement = this.tabsContainer.querySelector(`[data-tab-id="${tabId}"]`) as HTMLElement;
    if (tabElement) {
      if (isActive) {
        tabElement.style.backgroundColor = "white";
        tabElement.style.borderBottom = "2px solid #2196f3";
      } else {
        tabElement.style.backgroundColor = "#e0e0e0";
        tabElement.style.borderBottom = "none";
      }
    }
  }
}
