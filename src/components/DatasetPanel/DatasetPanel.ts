import { CdiscDataProvider } from "../../data/providers/CdiscDataProvider";
import { type CdiscDataset } from "../../data/types";
import { MultiDatasetVisualizer } from "../MultiDatasetVisualizer";

interface DatasetInfo {
  id: string;
  name: string;
  label: string;
  dataset: CdiscDataset;
  isLoaded: boolean;
}

export class DatasetPanel {
  private container: HTMLElement;
  private panelElement: HTMLElement;
  private headerElement: HTMLElement;
  private contentElement: HTMLElement;
  private toggleButton: HTMLElement;
  private datasets: DatasetInfo[] = [];
  private multiDatasetVisualizer: MultiDatasetVisualizer;
  private isMinimized: boolean = false;
  private onToggleCallback?: (isMinimized: boolean) => void;

  constructor(parent: HTMLElement, multiDatasetVisualizer: MultiDatasetVisualizer) {
    this.multiDatasetVisualizer = multiDatasetVisualizer;

    // Create the main container
    this.container = document.createElement("div");
    this.container.className = "dataset-panel";

    // Create the panel element
    this.panelElement = document.createElement("div");
    this.panelElement.className = "dataset-panel__panel";

    // Create header with title and minimize button
    this.headerElement = document.createElement("div");
    this.headerElement.className = "dataset-panel__header";

    const titleElement = document.createElement("h3");
    titleElement.className = "dataset-panel__title";
    titleElement.textContent = "Datasets";

    this.toggleButton = document.createElement("button");
    this.toggleButton.className = "dataset-panel__toggle";
    this.toggleButton.innerHTML = "−";
    this.toggleButton.title = "Minimize panel";

    this.headerElement.appendChild(titleElement);
    this.headerElement.appendChild(this.toggleButton);

    // Create content area
    this.contentElement = document.createElement("div");
    this.contentElement.className = "dataset-panel__content";

    // Create dataset list
    const listElement = document.createElement("div");
    listElement.className = "dataset-panel__list";
    this.contentElement.appendChild(listElement);

    // Assemble the panel
    this.panelElement.appendChild(this.headerElement);
    this.panelElement.appendChild(this.contentElement);
    this.container.appendChild(this.panelElement);

    // Add to parent
    parent.appendChild(this.container);

    // Setup event listeners
    this.setupEventListeners();
  }

  public addDataset(id: string, name: string, label: string, dataset: CdiscDataset): void {
    // Check if dataset already exists
    const existingDataset = this.datasets.find((d) => d.id === id);
    if (existingDataset) return;

    const datasetInfo: DatasetInfo = {
      id,
      name,
      label,
      dataset,
      isLoaded: false,
    };

    this.datasets.push(datasetInfo);
    this.renderDatasetList();
  }

  public markDatasetAsLoaded(id: string): void {
    const dataset = this.datasets.find((d) => d.id === id);
    if (dataset) {
      dataset.isLoaded = true;
      this.renderDatasetList();
    }
  }

  public markDatasetAsUnloaded(id: string): void {
    const dataset = this.datasets.find((d) => d.id === id);
    if (dataset) {
      dataset.isLoaded = false;
      this.renderDatasetList();
    }
  }

  private setupEventListeners(): void {
    this.toggleButton.addEventListener("click", () => {
      this.toggleMinimize();
    });
  }

  private renderDatasetList(): void {
    const listElement = this.contentElement.querySelector(".dataset-panel__list") as HTMLElement;
    listElement.innerHTML = "";

    this.datasets.forEach((datasetInfo) => {
      const itemElement = document.createElement("div");
      itemElement.className = `dataset-panel__item ${datasetInfo.isLoaded ? "dataset-panel__item--loaded" : ""}`;

      const textElement = document.createElement("div");
      textElement.className = "dataset-panel__item-text";

      const nameElement = document.createElement("div");
      nameElement.className = "dataset-panel__item-name";
      nameElement.textContent = datasetInfo.name.toUpperCase();

      textElement.appendChild(nameElement);

      itemElement.appendChild(textElement);

      // Add click handler if not already loaded
      if (!datasetInfo.isLoaded) {
        itemElement.style.cursor = "pointer";
        itemElement.addEventListener("click", async () => {
          await this.loadDataset(datasetInfo);
        });
      }

      listElement.appendChild(itemElement);
    });
  }

  private async loadDataset(datasetInfo: DatasetInfo): Promise<void> {
    try {
      // Create data provider
      const dataProvider = new CdiscDataProvider(datasetInfo.dataset);

      // Add to multi-dataset visualizer
      await this.multiDatasetVisualizer.addDataset(datasetInfo.id, datasetInfo.label, dataProvider);

      // Mark as loaded
      this.markDatasetAsLoaded(datasetInfo.id);
    } catch (error) {
      console.error(`Failed to load dataset ${datasetInfo.id}:`, error);
    }
  }

  public getLoadedDatasets(): string[] {
    return this.datasets.filter((d) => d.isLoaded).map((d) => d.id);
  }

  public getAvailableDatasets(): DatasetInfo[] {
    return [...this.datasets];
  }

  public setOnToggleCallback(callback: (isMinimized: boolean) => void): void {
    this.onToggleCallback = callback;
  }

  public getIsMinimized(): boolean {
    return this.isMinimized;
  }

  public toggleMinimize(): void {
    this.isMinimized = !this.isMinimized;

    if (this.isMinimized) {
      this.panelElement.classList.add("dataset-panel__panel--minimized");
      this.toggleButton.innerHTML = "+";
      this.toggleButton.title = "Expand panel";
    } else {
      this.panelElement.classList.remove("dataset-panel__panel--minimized");
      this.toggleButton.innerHTML = "−";
      this.toggleButton.title = "Minimize panel";
    }

    // Call the callback if it exists
    if (this.onToggleCallback) {
      this.onToggleCallback(this.isMinimized);
    }
  }
}
