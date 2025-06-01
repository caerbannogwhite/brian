export interface Column {
  header: string;
  key: string;
  width?: number;
  type: "string" | "number" | "date";
}

export interface CellStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  padding?: number;
}

export interface SpreadsheetOptions {
  cellHeight: number;
  headerHeight: number;
  defaultCellStyle: CellStyle;
  headerStyle: CellStyle;
  rowIndexStyle: CellStyle;
  borderColor: string;
  borderWidth: number;
}

export class SpreadsheetVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private columns: Column[];
  private data: any[];
  private options: SpreadsheetOptions;
  private columnWidths: number[] = [];
  private minCellWidth: number = 100; // Minimum width for a cell
  private padding: number = 16; // Padding for text measurement
  private rowIndexWidth: number = 50; // Width for the row index column

  constructor(canvas: HTMLCanvasElement, columns: Column[], data: any[], options: Partial<SpreadsheetOptions> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.columns = columns;
    this.data = data;

    // Default options
    this.options = {
      cellHeight: 30,
      headerHeight: 40,
      defaultCellStyle: {
        backgroundColor: "#ffffff",
        textColor: "#000000",
        fontSize: 14,
        fontFamily: "Arial",
        textAlign: "left",
        padding: 8,
      },
      headerStyle: {
        backgroundColor: "#f0f0f0",
        textColor: "#000000",
        fontSize: 14,
        fontFamily: "Arial",
        textAlign: "center",
        padding: 8,
      },
      rowIndexStyle: {
        backgroundColor: "#f8f9fa",
        textColor: "#6c757d",
        fontSize: 14,
        fontFamily: "Arial",
        textAlign: "center",
        padding: 8,
      },
      borderColor: "#e0e0e0",
      borderWidth: 1,
      ...options,
    };

    this.setupEventListeners();
    this.resize();
  }

  private setupEventListeners(): void {
    window.addEventListener("resize", () => this.resize());
  }

  private measureText(text: string, style: CellStyle): number {
    this.ctx.font = `${style.fontSize || 14}px ${style.fontFamily || "Arial"}`;
    const metrics = this.ctx.measureText(text);
    return metrics.width + (style.padding || 8) * 2 + this.padding;
  }

  private calculateColumnWidths(): void {
    const { headerStyle, defaultCellStyle } = this.options;
    
    // Calculate widths based on content
    this.columnWidths = this.columns.map((column, colIndex) => {
      // Measure header width
      const headerWidth = this.measureText(column.header, headerStyle);
      
      // Measure data widths
      const maxDataWidth = Math.max(
        ...this.data.map(row => {
          const value = row[column.key]?.toString() ?? "";
          return this.measureText(value, defaultCellStyle);
        })
      );
      
      // Use the larger of header width and max data width, but not less than minCellWidth
      return Math.max(headerWidth, maxDataWidth, this.minCellWidth);
    });
  }

  private resize(): void {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.calculateColumnWidths();
    this.draw();
  }

  private draw(): void {
    const { ctx, canvas, columns, data, options } = this;
    const { cellHeight, headerHeight, borderColor, borderWidth, rowIndexStyle } = options;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw header starting from the left edge
    let currentX = 0;
    
    // Draw row index header
    this.drawCell(currentX, 0, this.rowIndexWidth, headerHeight, "#", rowIndexStyle);
    currentX += this.rowIndexWidth;

    // Draw column headers
    columns.forEach((column, index) => {
      const width = this.columnWidths[index];
      this.drawCell(currentX, 0, width, headerHeight, column.header, options.headerStyle);
      currentX += width;
    });

    // Draw data rows
    data.forEach((row, rowIndex) => {
      currentX = 0;
      const rowY = headerHeight + rowIndex * cellHeight;

      // Draw row index
      this.drawCell(currentX, rowY, this.rowIndexWidth, cellHeight, (rowIndex + 1).toString(), rowIndexStyle);
      currentX += this.rowIndexWidth;

      // Draw data cells
      columns.forEach((column, index) => {
        const width = this.columnWidths[index];
        const value = row[column.key]?.toString() ?? "";
        this.drawCell(currentX, rowY, width, cellHeight, value, options.defaultCellStyle);
        currentX += width;
      });
    });
  }

  private drawCell(x: number, y: number, width: number, height: number, text: string, style: CellStyle): void {
    const { ctx, canvas, options } = this;
    const { borderColor, borderWidth } = options;

    // Draw cell background
    ctx.fillStyle = style.backgroundColor || "#ffffff";
    ctx.fillRect(x, y, width, height);

    // Draw cell border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(x, y, width, height);

    // Draw text
    ctx.fillStyle = style.textColor || "#000000";
    ctx.font = `${style.fontSize || 14}px ${style.fontFamily || "Arial"}`;
    ctx.textAlign = style.textAlign || "left";

    const padding = style.padding || 8;
    let textX = x + padding;
    if (style.textAlign === "center") {
      textX = x + width / 2;
    } else if (style.textAlign === "right") {
      textX = x + width - padding;
    }

    // Clip text to cell width
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + borderWidth, y + borderWidth, width - borderWidth * 2, height - borderWidth * 2);
    ctx.clip();

    // Draw text with vertical centering
    const textY = y + (height + (style.fontSize || 14)) / 2;
    ctx.fillText(text, textX, textY);
    ctx.restore();
  }
} 