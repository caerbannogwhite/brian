import { ColumnInternal } from "../SpreadsheetVisualizer/internals";

export interface CellValueBarOptions {
  container: HTMLElement;
}

export interface CellInfo {
  value: any;
  column: ColumnInternal;
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

  public updateCell(cell: { row: number; col: number; value: any; column: any } | null): void {
    if (!cell) {
      this.positionElement.textContent = "";
      this.valueElement.textContent = "";
      this.valueElement.className = "cell-value-bar__value";
      return;
    }

    // Format position as "column name":"row index"
    const position = `${cell.column.name}:${cell.row}`;
    this.positionElement.textContent = position;

    this.valueElement.textContent = cell.value;
    this.valueElement.className = `cell-value-bar__value cell-value-bar__value--${cell.column.dataType}`;
  }

  public destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
  }
}
