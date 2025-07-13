import { Column } from "../SpreadsheetVisualizer";

export interface CellValueBarOptions {
  container: HTMLElement;
}

export interface CellInfo {
  value: any;
  column: Column;
  position: { row: number; col: number };
}

export class CellValueBar {
  private container: HTMLElement;
  private element: HTMLDivElement;
  private positionElement!: HTMLSpanElement;
  private valueElement!: HTMLSpanElement;

  constructor(options: CellValueBarOptions) {
    this.container = options.container;
    this.element = document.createElement("div");
    this.element.className = "cell-value-bar";
    this.setupHTML();
    this.container.appendChild(this.element);
  }

  private setupHTML(): void {
    this.element.innerHTML = `
      <span class="cell-value-bar__position"></span>
      <span class="cell-value-bar__value"></span>
    `;

    this.positionElement = this.element.querySelector(".cell-value-bar__position") as HTMLSpanElement;
    this.valueElement = this.element.querySelector(".cell-value-bar__value") as HTMLSpanElement;
  }

  public updateCell(cell: { row: number; col: number; value: any; formatted: string; column: Column } | null): void {
    if (!cell) {
      this.positionElement.textContent = "";
      this.valueElement.textContent = "";
      this.valueElement.className = "cell-value-bar__value";
      return;
    }

    // Format position as "column name":"row index"
    const position = `${cell.column.name}:${cell.row}`;
    this.positionElement.textContent = position;

    this.valueElement.innerHTML = this.formatValueDisplay(cell.value, cell.formatted);
    this.valueElement.className = `cell-value-bar__value cell-value-bar__value--${cell.column.dataType}`;
  }

  private formatValueDisplay(raw: any, formatted: string): string {
    // If formatted and raw are the same, just show formatted
    if (formatted === raw) {
      return formatted;
    }

    // Show formatted value followed by raw value in brackets with dimmed styling
    return `${formatted} <span class="cell-value-bar__raw-value">[${raw}]</span>`;
  }

  public destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
