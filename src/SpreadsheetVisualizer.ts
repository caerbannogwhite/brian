export interface Column {
  header: string;
  key: string;
  width: number;
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
  borderColor: string;
  borderWidth: number;
}

export class SpreadsheetVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private columns: Column[];
  private data: any[];
  private options: SpreadsheetOptions;
  private scrollX: number = 0;
  private scrollY: number = 0;
  private isDragging: boolean = false;
  private lastX: number = 0;
  private lastY: number = 0;

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
      borderColor: "#e0e0e0",
      borderWidth: 1,
      ...options,
    };

    this.setupEventListeners();
    this.resize();
  }

  private setupEventListeners(): void {
    // Handle window resize
    window.addEventListener("resize", () => this.resize());

    // Handle mouse wheel for scrolling
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.scrollY += e.deltaY;
      this.scrollX += e.deltaX;
      this.draw();
    });

    // Handle mouse drag for scrolling
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    });

    this.canvas.addEventListener("mousemove", (e) => {
      if (this.isDragging) {
        const deltaX = e.clientX - this.lastX;
        const deltaY = e.clientY - this.lastY;
        this.scrollX -= deltaX;
        this.scrollY -= deltaY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;
        this.draw();
      }
    });

    this.canvas.addEventListener("mouseup", () => {
      this.isDragging = false;
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.isDragging = false;
    });
  }

  private resize(): void {
    this.canvas.width = this.canvas.offsetWidth;
    this.canvas.height = this.canvas.offsetHeight;
    this.draw();
  }

  private draw(): void {
    const { ctx, canvas, columns, data, options } = this;
    const { cellHeight, headerHeight, borderColor, borderWidth } = options;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate total width
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const totalHeight = (data.length + 1) * cellHeight; // +1 for header

    // Draw header
    let currentX = -this.scrollX;
    columns.forEach((column) => {
      this.drawCell(currentX, -this.scrollY, column.width, headerHeight, column.header, options.headerStyle);
      currentX += column.width;
    });

    // Draw data rows
    data.forEach((row, rowIndex) => {
      currentX = -this.scrollX;
      const rowY = -this.scrollY + headerHeight + rowIndex * cellHeight;

      columns.forEach((column) => {
        const value = row[column.key]?.toString() ?? "";
        this.drawCell(currentX, rowY, column.width, cellHeight, value, options.defaultCellStyle);
        currentX += column.width;
      });
    });
  }

  private drawCell(x: number, y: number, width: number, height: number, text: string, style: CellStyle): void {
    const { ctx, canvas, options } = this;
    const { borderColor, borderWidth } = options;

    // Only draw if cell is visible
    if (x + width < 0 || x > canvas.width || y + height < 0 || y > canvas.height) {
      return;
    }

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