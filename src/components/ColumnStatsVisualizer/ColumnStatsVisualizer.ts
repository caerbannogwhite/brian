import { Column } from "../SpreadsheetVisualizer/types";
import { DataProvider } from "../SpreadsheetVisualizer/types";

interface ColumnStats {
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  valueCounts?: Map<string, number>;
  totalCount: number;
  nullCount: number;
}

export class ColumnStatsVisualizer {
  private container: HTMLElement;
  private dataProvider: DataProvider | null;
  private currentColumn: Column | null = null;
  private stats: ColumnStats | null = null;

  constructor(parent: HTMLElement, dataProvider: DataProvider | null, statsPanelWidth: number) {
    this.container = document.createElement("div");
    this.dataProvider = dataProvider;

    this.container.id = "column-stats-container";
    this.container.style.width = `${statsPanelWidth}px`;

    parent.appendChild(this.container);
  }

    public async setDataProvider(dataProvider: DataProvider, selectedColumns: Column[] = []) {
    this.dataProvider = dataProvider;
    
    // Handle the data provider change with the selected columns from the new dataset
    if (selectedColumns.length > 0) {
      // Show stats for the first selected column (assuming single column selection mode)
      await this.showStats(selectedColumns[0]);
    } else {
      // No columns selected in the new dataset, hide the stats panel
      this.hide();
    }
  }

  public async showStats(column: Column) {
    if (!this.dataProvider) {
      console.warn("No data provider set for ColumnStatsVisualizer");
      return;
    }

    this.currentColumn = column;
    this.container.style.display = "block";
    this.container.classList.add("visible");
    await this.calculateStats();
    this.render();
  }

  public hide() {
    this.container.style.display = "none";
    this.container.classList.remove("visible");
    this.currentColumn = null;
    this.stats = null;
  }

  private async calculateStats() {
    if (!this.currentColumn || !this.dataProvider) return;

    const metadata = await this.dataProvider.getMetadata();

    const totalRows = metadata.totalRows;
    const columns = metadata.columns;
    const columnIndex = columns.findIndex((col) => col.key === this.currentColumn!.key);

    if (columnIndex === -1) return;

    const data = await this.dataProvider.fetchData(0, totalRows, columnIndex, columnIndex);
    const values = data.flat();

    this.stats = {
      totalCount: values.length,
      nullCount: values.filter((v) => v === null || v === undefined).length,
      valueCounts: new Map<string, number>(),
    };

    if (this.currentColumn.dataType === "number") {
      const numbers = values.filter((v) => typeof v === "number") as number[];
      if (numbers.length > 0) {
        this.stats.min = Math.min(...numbers);
        this.stats.max = Math.max(...numbers);
        this.stats.mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;

        // Calculate median
        const sorted = [...numbers].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        this.stats.median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];

        // Calculate standard deviation
        const mean = this.stats.mean;
        const squareDiffs = numbers.map((value) => {
          const diff = value - mean;
          return diff * diff;
        });
        this.stats.stdDev = Math.sqrt(squareDiffs.reduce((a, b) => a + b, 0) / numbers.length);
      }
    } else {
      // For categorical data, count occurrences
      values.forEach((value) => {
        if (value !== null && value !== undefined) {
          const key = String(value);
          this.stats!.valueCounts!.set(key, (this.stats!.valueCounts!.get(key) || 0) + 1);
        }
      });
    }
  }

  private render() {
    if (!this.currentColumn || !this.stats) return;

    this.container.innerHTML = `
      <div class="column-stats">
        <div class="column-stats__header">
          <h3>${this.currentColumn.name}</h3>
          ${this.currentColumn.label ? `<div class="column-stats__label">${this.currentColumn.label}</div>` : ""}
          <div class="column-stats__type">${this.currentColumn.dataType}</div>
        </div>
        <div class="column-stats__container">
          ${this.renderStats()}
        </div>
        ${this.renderVisualization()}
      </div>
    `;
  }

  private renderStats() {
    if (!this.stats) return "";

    const stats = [];

    // Common stats for all types
    stats.push(`
      <div class="column-stats__item">
        <div class="column-stats__label">Total Count</div>
        <div class="column-stats__value">${this.stats.totalCount.toLocaleString()}</div>
      </div>
      <div class="column-stats__item">
        <div class="column-stats__label">Null Count</div>
        <div class="column-stats__value">${this.stats.nullCount.toLocaleString()}</div>
      </div>
    `);

    // Numeric stats
    if (this.currentColumn?.dataType === "number" && this.stats.min !== undefined) {
      stats.push(`
        <div class="column-stats__item">
          <div class="column-stats__label">Min</div>
          <div class="column-stats__value">${this.stats.min.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
        <div class="column-stats__item">
          <div class="column-stats__label">Mean</div>
          <div class="column-stats__value">${this.stats.mean!.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
        <div class="column-stats__item">
          <div class="column-stats__label">Std Dev</div>
          <div class="column-stats__value">${this.stats.stdDev!.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
        <div class="column-stats__item">
        <div class="column-stats__label">Median</div>
          <div class="column-stats__value">${this.stats.median!.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
        <div class="column-stats__item">
          <div class="column-stats__label">Max</div>
          <div class="column-stats__value">${this.stats.max!.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
      `);
    }

    return stats.join("");
  }

  private renderVisualization() {
    if (!this.stats || !this.stats.valueCounts) return "";

    // For categorical data, show horizontal histogram of top 10 values
    if (this.currentColumn?.dataType !== "number") {
      const sortedCounts = Array.from(this.stats.valueCounts.entries()).sort((a, b) => b[1] - a[1]);
      const top10 = sortedCounts.slice(0, 10);

      const maxCount = Math.max(...sortedCounts.map(([_, count]) => count));
      const totalValidValues = this.stats.totalCount - this.stats.nullCount;

      const categoriesNumber = sortedCounts.length;

      return `
        <div class="histogram__container">
          <div class="histogram__title">Top ${categoriesNumber > 10 ? 10 : categoriesNumber} Most Frequent Values</div>
          <div class="histogram__chart">
            ${top10
              .map(([value, count]) => {
                const percentage = ((count / totalValidValues) * 100).toFixed(1);
                const displayValue = value.length > 15 ? value.substring(0, 15) + "..." : value;
                return `
                <div class="histogram__bar-container">
                  <div class="histogram__label" title="${value}">${displayValue}</div>
                  <div class="histogram__bar">
                    <div class="histogram__bar-fill" style="width: ${(count / maxCount) * 100}%"></div>
                  </div>
                  <div class="histogram__count">${count.toLocaleString()} (${percentage}%)</div>
                </div>
              `;
              })
              .join("")}
          </div>
          ${categoriesNumber > 10 ? `<div class="histogram__title">${(categoriesNumber - 10).toLocaleString()} more categories.</div>` : ""}
        </div>
      `;
    }

    return "";
  }
}
