import { SpreadsheetVisualizer } from "../SpreadsheetVisualizer/SpreadsheetVisualizer";
import { Column } from "../SpreadsheetVisualizer/types";

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
  private spreadsheetVisualizer: SpreadsheetVisualizer | null = null;
  private currentColumn: Column | null = null;
  private stats: ColumnStats | null = null;

  constructor(parent: HTMLElement, spreadsheetVisualizer: SpreadsheetVisualizer | null, statsPanelWidth: number) {
    this.container = document.createElement("div");
    this.spreadsheetVisualizer = spreadsheetVisualizer;

    this.container.id = "column-stats-container";
    this.container.style.width = `${statsPanelWidth}px`;

    parent.appendChild(this.container);
  }

  public async setSpreadsheetVisualizer(spreadsheetVisualizer: SpreadsheetVisualizer) {
    this.spreadsheetVisualizer = spreadsheetVisualizer;

    // Handle the data provider change with the selected columns from the new dataset
    if (this.spreadsheetVisualizer.getSelectedColumns().length > 0) {
      // Show stats for the first selected column (assuming single column selection mode)
      await this.showStats(this.spreadsheetVisualizer.getSelectedColumns()[0]);
    } else {
      // No columns selected in the new dataset, hide the stats panel
      this.hide();
    }
  }

  public async showStats(column: Column) {
    this.currentColumn = column;
    this.container.style.display = "block";
    this.container.classList.add("visible");
    await this.calculateStats();
    await this.render();
  }

  public hide() {
    this.container.style.display = "none";
    this.container.classList.remove("visible");
    this.currentColumn = null;
    this.stats = null;
  }

  private async calculateStats() {
    if (!this.currentColumn || !this.spreadsheetVisualizer) return;
    const values = await this.spreadsheetVisualizer.getColumnValues(this.currentColumn!.key);
    this.stats = {
      totalCount: values.length,
      nullCount: values.filter((v) => v.raw === null).length,
      valueCounts: new Map<string, number>(),
    };

    if (this.currentColumn.dataType === "integer" || this.currentColumn.dataType === "float") {
      const numbers = values.map((v) => Number(v.raw)).filter((v) => v !== null && !isNaN(v));
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
        if (value.raw !== null) {
          const key = value.formatted;
          this.stats!.valueCounts!.set(key, (this.stats!.valueCounts!.get(key) || 0) + 1);
        }
      });
    }
  }

  public getContainer(): HTMLElement {
    return this.container;
  }

  private async render() {
    if (!this.currentColumn || !this.stats) return;

    this.container.innerHTML = `
      <div class="column-stats">
        <div class="column-stats__header">
          <h3>${this.currentColumn.name}</h3>
          ${this.currentColumn.label ? `<div class="column-stats__label">${this.currentColumn.label}</div>` : ""}
          <div class="column-stats__type">${this.currentColumn.dataType}</div>
        </div>
        <div class="column-stats__container">
          ${await this.renderStats()}
        </div>
        ${await this.renderVisualization()}
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
    if (this.currentColumn?.dataType === "integer" || (this.currentColumn?.dataType === "float" && this.stats.min !== undefined)) {
      stats.push(`
        <div class="column-stats__item">
          <div class="column-stats__label">Min</div>
          <div class="column-stats__value">${this.stats.min!.toLocaleString(undefined, {
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

  private async renderVisualization() {
    if (!this.stats) return "";

    // For numerical data, show distribution histogram
    if (this.currentColumn?.dataType === "integer" || this.currentColumn?.dataType === "float") {
      return await this.renderNumericalHistogram();
    }

    // For categorical data, show horizontal histogram of top 10 values
    if (this.stats.valueCounts) {
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

  private async renderNumericalHistogram() {
    if (!this.currentColumn || !this.spreadsheetVisualizer || !this.stats) return "";

    const values = await this.spreadsheetVisualizer.getColumnValues(this.currentColumn.key);
    const numbers = values.map((v) => Number(v.raw)).filter((v) => v !== null && !isNaN(v));
    
    if (numbers.length === 0) return "";

    const binCount = Math.min(10, Math.max(5, Math.ceil(Math.sqrt(numbers.length))));
    const min = this.stats.min!;
    const max = this.stats.max!;
    const binWidth = (max - min) / binCount;

    // Create bins
    const bins = Array.from({ length: binCount }, (_, i) => ({
      start: min + i * binWidth,
      end: min + (i + 1) * binWidth,
      count: 0,
      label: this.formatBinLabel(min + i * binWidth, min + (i + 1) * binWidth, i === binCount - 1)
    }));

    // Count values in each bin
    numbers.forEach(value => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
      bins[binIndex].count++;
    });

    const maxCount = Math.max(...bins.map(bin => bin.count));
    const totalValidValues = this.stats.totalCount - this.stats.nullCount;

    return `
      <div class="histogram__container">
        <div class="histogram__title">Distribution</div>
        <div class="histogram__chart histogram__chart--numerical">
          ${bins.map(bin => {
            // const percentage = ((bin.count / totalValidValues) * 100).toFixed(1);
            const height = maxCount > 0 ? (bin.count / maxCount) * 100 : 0;
            return `
              <div class="histogram__numerical-bar">
                <div class="histogram__numerical-bar-fill" style="height: ${height}%"></div>
                <div class="histogram__numerical-count">${bin.count}</div>
                <div class="histogram__numerical-label" title="${bin.label}">${bin.label}</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  private formatBinLabel(start: number, end: number, isLast: boolean): string {
    const formatNumber = (num: number) => {
      if (Math.abs(num) >= 1000000) {
        return (num / 1000000).toFixed(1) + "M";
      } else if (Math.abs(num) >= 1000) {
        return (num / 1000).toFixed(1) + "K";
      } else if (num % 1 === 0) {
        return num.toString();
      } else {
        return num.toFixed(1);
      }
    };

    const startStr = formatNumber(start);
    const endStr = formatNumber(end);
    
    if (isLast) {
      return `[${startStr}, ${endStr}]`;
    } else {
      return `[${startStr}, ${endStr})`;
    }
  }
}
