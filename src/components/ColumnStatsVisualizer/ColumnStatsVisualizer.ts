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
  private dataProvider: DataProvider;
  private currentColumn: Column | null = null;
  private stats: ColumnStats | null = null;

  constructor(container: HTMLElement, dataProvider: DataProvider) {
    this.container = container;
    this.dataProvider = dataProvider;
    this.container.style.display = "none";
  }

  public async showStats(column: Column) {
    this.currentColumn = column;
    this.container.style.display = "block";
    await this.calculateStats();
    this.render();
  }

  public hide() {
    this.container.style.display = "none";
    this.currentColumn = null;
    this.stats = null;
  }

  private async calculateStats() {
    if (!this.currentColumn) return;

    const totalRows = await this.dataProvider.getTotalRows();
    const columns = await this.dataProvider.getColumns();
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
        <div class="stats-header">
          <h3>${this.currentColumn.header}</h3>
          <div class="column-type">${this.currentColumn.dataType}</div>
        </div>
        <div class="stats-container">
          ${this.renderStats()}
        </div>
        ${this.renderVisualization()}
      </div>
    `;

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      .column-stats {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: white;
        overflow-y: auto;
      }
      .stats-header {
        padding: 1rem;
        border-bottom: 1px solid #eee;
        background: #f8f9fa;
      }
      .stats-header h3 {
        margin: 0;
        font-size: 1.2rem;
        color: #333;
      }
      .column-type {
        font-size: 0.8rem;
        color: #666;
        text-transform: uppercase;
        margin-top: 0.25rem;
      }
      .stats-container {
        padding: 1rem;
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.75rem;
        border-bottom: 1px solid #eee;
      }
      .stat-item {
        padding: 0.75rem;
        background: #f8f9fa;
        border-radius: 6px;
        border: 1px solid #eee;
      }
      .stat-label {
        font-size: 0.75rem;
        color: #666;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.25rem;
      }
      .stat-value {
        font-size: 1.1rem;
        font-weight: 600;
        color: #333;
        font-family: 'SF Mono', 'Consolas', monospace;
      }
      .histogram-container {
        padding: 1rem;
        flex: 1;
        overflow-y: auto;
      }
      .histogram-title {
        font-size: 0.9rem;
        color: #666;
        margin-bottom: 1rem;
      }
      .histogram {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .histogram-bar-container {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      .histogram-label {
        width: 120px;
        font-size: 0.8rem;
        color: #666;
        text-align: right;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        padding-right: 0.5rem;
        cursor: pointer;
        transition: color 0.2s ease;
      }
      .histogram-label:hover {
        color: #2196f3;
        font-weight: 500;
      }
      .histogram-bar {
        flex: 1;
        height: 24px;
        background: #e3f2fd;
        border-radius: 4px;
        position: relative;
        min-width: 0;
      }
      .histogram-bar-fill {
        height: 100%;
        background: #2196f3;
        border-radius: 4px;
        transition: width 0.3s ease-out;
      }
      .histogram-count {
        min-width: 80px;
        font-size: 0.8rem;
        color: #666;
        font-family: 'SF Mono', 'Consolas', monospace;
      }
    `;
    this.container.appendChild(style);
  }

  private renderStats() {
    if (!this.stats) return "";

    const stats = [];

    // Common stats for all types
    stats.push(`
      <div class="stat-item">
        <div class="stat-label">Total Count</div>
        <div class="stat-value">${this.stats.totalCount.toLocaleString()}</div>
      </div>
      <div class="stat-item">
        <div class="stat-label">Null Count</div>
        <div class="stat-value">${this.stats.nullCount.toLocaleString()}</div>
      </div>
    `);

    // Numeric stats
    if (this.currentColumn?.dataType === "number" && this.stats.min !== undefined) {
      stats.push(`
        <div class="stat-item">
          <div class="stat-label">Min</div>
          <div class="stat-value">${this.stats.min.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Mean</div>
          <div class="stat-value">${this.stats.mean!.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Std Dev</div>
          <div class="stat-value">${this.stats.stdDev!.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
        <div class="stat-item">
        <div class="stat-label">Median</div>
          <div class="stat-value">${this.stats.median!.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}</div>
        </div>
        <div class="stat-item">
          <div class="stat-label">Max</div>
          <div class="stat-value">${this.stats.max!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      `);
    }

    return stats.join("");
  }

  private renderVisualization() {
    if (!this.stats || !this.stats.valueCounts) return "";

    // For categorical data, show horizontal histogram of top 10 values
    if (this.currentColumn?.dataType !== "number") {
      const sortedCounts = Array.from(this.stats.valueCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const maxCount = Math.max(...sortedCounts.map(([_, count]) => count));
      const totalValidValues = this.stats.totalCount - this.stats.nullCount;

      return `
        <div class="histogram-container">
          <div class="histogram-title">Top 10 Most Frequent Values</div>
          <div class="histogram">
            ${sortedCounts
              .map(
                ([value, count]) => {
                  const percentage = ((count / totalValidValues) * 100).toFixed(1);
                  const displayValue = value.length > 15 ? value.substring(0, 15) + "..." : value;
                  return `
                <div class="histogram-bar-container">
                  <div class="histogram-label" title="${value}">${displayValue}</div>
                  <div class="histogram-bar">
                    <div class="histogram-bar-fill" style="width: ${(count / maxCount) * 100}%"></div>
                  </div>
                  <div class="histogram-count">${count.toLocaleString()} (${percentage}%)</div>
                </div>
              `;
                }
              )
              .join("")}
          </div>
        </div>
      `;
    }

    return "";
  }
}
