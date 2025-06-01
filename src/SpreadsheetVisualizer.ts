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

interface CellPosition {
  row: number;
  col: number;
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

  // Selection state
  private isSelecting: boolean = false;
  private selectionStart: CellPosition | null = null;
  private selectionEnd: CellPosition | null = null;
  private selectionColor: string = "rgba(0, 120, 212, 0.2)";
  private selectionBorderColor: string = "rgb(0, 120, 212)";

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

    // Mouse events for selection
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseUp.bind(this));

    // Keyboard events for copy
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
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

  private getCellAtPosition(x: number, y: number): CellPosition | null {
    const { headerHeight, cellHeight } = this.options;
    
    // Check if click is in header row
    if (y < headerHeight) {
      const col = this.getColumnAtX(x);
      return col !== null ? { row: -1, col } : null;
    }

    // Check if click is in data rows
    const row = Math.floor((y - headerHeight) / cellHeight);
    if (row >= 0 && row < this.data.length) {
      const col = this.getColumnAtX(x);
      return col !== null ? { row, col } : null;
    }

    return null;
  }

  private getColumnAtX(x: number): number | null {
    let currentX = 0;
    
    // Check row index column
    if (x < this.rowIndexWidth) {
      return -1; // Row index column
    }
    currentX += this.rowIndexWidth;

    // Check data columns
    for (let i = 0; i < this.columns.length; i++) {
      const width = this.columnWidths[i];
      if (x >= currentX && x < currentX + width) {
        return i;
      }
      currentX += width;
    }

    return null;
  }

  private getColumnX(col: number): number {
    let x = 0;
    if (col === -1) {
      return x; // Row index column is at x = 0
    }
    x += this.rowIndexWidth; // Add row index column width
    for (let i = 0; i < col; i++) {
      x += this.columnWidths[i];
    }
    return x;
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cell = this.getCellAtPosition(x, y);
    if (cell) {
      this.isSelecting = true;
      this.selectionStart = cell;
      this.selectionEnd = cell;
      this.draw();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isSelecting || !this.selectionStart) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const cell = this.getCellAtPosition(x, y);
    if (cell) {
      this.selectionEnd = cell;
      this.draw();
    }
  }

  private handleMouseUp(): void {
    this.isSelecting = false;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Handle Ctrl+C or Cmd+C
    if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      this.copySelection();
    }
  }

  private copySelection(): void {
    if (!this.selectionStart || !this.selectionEnd) return;

    const startRow = Math.min(this.selectionStart.row, this.selectionEnd.row);
    const endRow = Math.max(this.selectionStart.row, this.selectionEnd.row);
    const startCol = Math.min(this.selectionStart.col, this.selectionEnd.col);
    const endCol = Math.max(this.selectionStart.col, this.selectionEnd.col);

    const rows: string[] = [];
    
    // Add header row if selected
    if (startRow === -1) {
      const headerCells: string[] = [];
      for (let col = startCol; col <= endCol; col++) {
        if (col === -1) {
          headerCells.push("#");
        } else {
          headerCells.push(this.columns[col].header);
        }
      }
      rows.push(headerCells.join("\t"));
    }

    // Add data rows
    for (let row = Math.max(0, startRow); row <= endRow; row++) {
      const cells: string[] = [];
      for (let col = startCol; col <= endCol; col++) {
        if (col === -1) {
          cells.push((row + 1).toString());
        } else {
          const value = this.data[row][this.columns[col].key]?.toString() ?? "";
          cells.push(value);
        }
      }
      rows.push(cells.join("\t"));
    }

    const text = rows.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      console.log("Selection copied to clipboard");
    }).catch(err => {
      console.error("Failed to copy selection:", err);
    });
  }

  private drawSelection(): void {
    if (!this.selectionStart || !this.selectionEnd) return;

    const startRow = Math.min(this.selectionStart.row, this.selectionEnd.row);
    const endRow = Math.max(this.selectionStart.row, this.selectionEnd.row);
    const startCol = Math.min(this.selectionStart.col, this.selectionEnd.col);
    const endCol = Math.max(this.selectionStart.col, this.selectionEnd.col);

    const { headerHeight, cellHeight } = this.options;

    // Draw selection rectangles
    for (let row = startRow; row <= endRow; row++) {
      const y = row === -1 ? 0 : headerHeight + row * cellHeight;
      const height = row === -1 ? headerHeight : cellHeight;

      for (let col = startCol; col <= endCol; col++) {
        const x = this.getColumnX(col);
        const width = col === -1 ? this.rowIndexWidth : this.columnWidths[col];

        // Draw selection background
        this.ctx.fillStyle = this.selectionColor;
        this.ctx.fillRect(x, y, width, height);

        // Draw selection border
        this.ctx.strokeStyle = this.selectionBorderColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
      }
    }
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

    // Draw selection on top
    this.drawSelection();
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