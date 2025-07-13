import { SpreadsheetVisualizerFocusable } from "../SpreadsheetVisualizer/SpreadsheetVisualizerFocusable";
import { DataProvider } from "../SpreadsheetVisualizer/types";
import { SpreadsheetOptions } from "../SpreadsheetVisualizer/types";
import { ColumnStatsVisualizerFocusable } from "../ColumnStatsVisualizer/ColumnStatsVisualizerFocusable";
import { DragDropZoneFocusable } from "../DragDropZone/DragDropZoneFocusable";
import { CellValueBar } from "../CellValueBar";
import { CdiscDataset } from "../../data/types";
import { EventDispatcher } from "../BrianApp/EventDispatcher";

interface DatasetTab {
  id: string;
  name: string;
  dataProvider: DataProvider;
  spreadsheetVisualizer: SpreadsheetVisualizerFocusable;
  container: HTMLElement;
  isActive: boolean;
}

export class MultiDatasetVisualizer {
  private container: HTMLElement;
  private tabsContainer: HTMLElement;
  private cellValueBarContainer: HTMLElement;
  private contentContainer: HTMLElement;
  private tabs: DatasetTab[] = [];
  private activeTabId: string | null = null;
  private options: SpreadsheetOptions;
  private sharedStatsVisualizer: ColumnStatsVisualizerFocusable;
  private dragDropZone: DragDropZoneFocusable | null = null;
  private cellValueBar: CellValueBar | null = null;
  // private onFileDropped?: (dataset: CdiscDataset, fileName: string) => void;
  private eventDispatcher?: EventDispatcher;

  constructor(parent: HTMLElement, options: SpreadsheetOptions = {}) {
    this.container = document.createElement("div");
    this.container.className = "multi-dataset-visualizer";
    this.options = options;

    // Set explicit dimensions if provided
    if (options.width) {
      this.container.style.width = `${options.width}px`;
    }
    if (options.height) {
      this.container.style.height = `${options.height}px`;
    }

    // Create tabs container
    this.tabsContainer = document.createElement("div");
    this.tabsContainer.className = "multi-dataset-visualizer__tabs-container";

    // Create cell value bar container
    this.cellValueBarContainer = document.createElement("div");
    this.cellValueBarContainer.className = "multi-dataset-visualizer__cell-value-bar-container";

    // Create content container
    this.contentContainer = document.createElement("div");
    this.contentContainer.className = "multi-dataset-visualizer__content-container";

    this.container.appendChild(this.tabsContainer);
    this.container.appendChild(this.cellValueBarContainer);
    this.container.appendChild(this.contentContainer);
    parent.appendChild(this.container);

    // Force layout calculation
    this.container.offsetHeight;

    // Create shared stats visualizer
    this.sharedStatsVisualizer = new ColumnStatsVisualizerFocusable(this.container, null, 350);

    // Setup resize handling
    this.setupResizeHandling();

    // Show drag-drop zone initially since no datasets are loaded
    this.showEmptyState();
  }

  public async addDataset(id: string, name: string, dataProvider: DataProvider): Promise<void> {
    // Create a separate container for this dataset's spreadsheet visualizer
    const datasetContainer = document.createElement("div");
    datasetContainer.className = "multi-dataset-visualizer__dataset-container";
    this.contentContainer.appendChild(datasetContainer);

    // Force layout calculation to get accurate dimensions
    this.container.offsetHeight;
    this.tabsContainer.offsetHeight;
    this.cellValueBarContainer.offsetHeight;
    this.contentContainer.offsetHeight;

    // Calculate actual available dimensions based on container size
    const containerWidth = this.container.clientWidth;
    const containerHeight = this.container.clientHeight;
    const tabsHeight = this.tabsContainer.offsetHeight || 40;
    const cellValueBarHeight = this.cellValueBarContainer.offsetHeight || 32;

    // Calculate dimensions that will fill the available space
    const availableWidth = containerWidth > 0 ? containerWidth : this.options.width;
    const availableHeight =
      containerHeight > 0
        ? containerHeight - tabsHeight - cellValueBarHeight
        : this.options.height
        ? this.options.height - tabsHeight - cellValueBarHeight
        : undefined;

    // Create options for the spreadsheet with calculated dimensions
    const spreadsheetOptions = {
      ...this.options,
      width: availableWidth,
      height: availableHeight,
      // Remove any fixed min/max constraints that might limit full utilization
      minWidth: Math.min(this.options.minWidth || 600, availableWidth || 600),
      minHeight: Math.min(this.options.minHeight || 400, availableHeight || 400),
    };

    // Create wrapper for event handling
    const spreadsheetVisualizer = new SpreadsheetVisualizerFocusable(
      datasetContainer,
      dataProvider,
      spreadsheetOptions,
      `spreadsheet-${id}`
    );

    // Connect selection change to cell value bar
    spreadsheetVisualizer.setOnSelectionChange((cell) => {
      if (this.cellValueBar && cell) {
        this.cellValueBar.updateCell(cell);
      } else if (this.cellValueBar) {
        this.cellValueBar.updateCell(null);
      }
    });

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

    // Register with event dispatcher if available
    if (this.eventDispatcher) {
      this.eventDispatcher.registerComponent(tab.spreadsheetVisualizer);
    }

    // Initialize the spreadsheet
    await spreadsheetVisualizer.initialize();

    // If this is the first tab, activate it and hide empty state
    if (this.tabs.length === 1) {
      this.hideEmptyState();
      this.showCellValueBar();
      await this.activateTab(id);
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

    // Unregister from event dispatcher if available
    if (this.eventDispatcher) {
      this.eventDispatcher.unregisterComponent(tab.spreadsheetVisualizer.componentId);
    }

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
        // Hide cell value bar when no datasets remain
        this.hideCellValueBar();
        // Show empty state when no datasets remain
        this.showEmptyState();
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

  public setOnFileDroppedCallback(_: (dataset: CdiscDataset, fileName: string) => void): void {
    // this.onFileDropped = callback;
  }

  public setEventDispatcher(eventDispatcher: EventDispatcher): void {
    this.eventDispatcher = eventDispatcher;

    // Register all existing tabs with the event dispatcher
    for (const tab of this.tabs) {
      this.eventDispatcher.registerComponent(tab.spreadsheetVisualizer);
    }
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

      // Set focus on the new active tab
      if (this.eventDispatcher) {
        this.eventDispatcher.setFocus(newTab.spreadsheetVisualizer.componentId);
      }

      // Force layout calculation and resize to ensure spreadsheet takes full space
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await newTab.spreadsheetVisualizer.resize();

      // Update the shared stats visualizer with the new spreadsheet visualizer
      await this.sharedStatsVisualizer.setSpreadsheetVisualizer(newTab.spreadsheetVisualizer);
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

  private setupResizeHandling(): void {
    // Use ResizeObserver for better performance than window resize events
    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => {
        this.handleResize();
      });
      resizeObserver.observe(this.container);
    } else {
      // Fallback for browsers without ResizeObserver
      window.addEventListener("resize", () => this.handleResize());
    }
  }

  private async handleResize(): Promise<void> {
    // Trigger resize on the active spreadsheet visualizer
    const activeTab = this.tabs.find((tab) => tab.isActive);
    if (activeTab) {
      // Force layout recalculation before resize
      this.container.offsetHeight;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await activeTab.spreadsheetVisualizer.resize();
    }
  }

  public async resize(): Promise<void> {
    // Public method to trigger resize from external components (e.g., BrianApp)
    await this.handleResize();
  }

  public destroy(): void {
    // Clean up all spreadsheet visualizers
    this.tabs.forEach((tab) => {
      tab.spreadsheetVisualizer.destroy();
    });

    // Hide shared stats visualizer
    this.sharedStatsVisualizer.hide();

    // Clean up drag drop zone
    if (this.dragDropZone) {
      this.dragDropZone.destroy();
      this.dragDropZone = null;
    }

    // Clean up cell value bar
    if (this.cellValueBar) {
      this.cellValueBar.destroy();
      this.cellValueBar = null;
    }
  }

  private showEmptyState(): void {
    if (!this.dragDropZone) {
      this.dragDropZone = new DragDropZoneFocusable(this.contentContainer);

      // Create wrapper and register with event dispatcher
      if (this.eventDispatcher) {
        this.eventDispatcher.registerComponent(this.dragDropZone);
        this.eventDispatcher.setFocus(this.dragDropZone.componentId);
      }
    } else {
      this.dragDropZone.show();
      // Set focus when showing again
      if (this.eventDispatcher && this.dragDropZone) {
        this.eventDispatcher.setFocus(this.dragDropZone.componentId);
      }
    }
  }

  private hideEmptyState(): void {
    if (this.dragDropZone) {
      this.dragDropZone.hide();
    }

    // Unregister from event dispatcher when hiding
    if (this.eventDispatcher && this.dragDropZone) {
      this.eventDispatcher.unregisterComponent(this.dragDropZone.componentId);
    }
  }

  private showCellValueBar(): void {
    if (this.cellValueBar) return;

    this.cellValueBar = new CellValueBar({
      container: this.cellValueBarContainer,
    });
  }

  private hideCellValueBar(): void {
    if (this.cellValueBar) {
      this.cellValueBar.destroy();
      this.cellValueBar = null;
    }
  }
}
