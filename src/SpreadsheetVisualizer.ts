export interface Column {
  header: string;
  key: string;
  width?: number;
  label?: string;
  format?: string;
  dataType: "string" | "integer" | "decimal" | "date" | "datetime" | "boolean";
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
  initialRowCount?: number; // Number of rows to fetch initially
  rowBuffer?: number; // Number of rows to keep in buffer
}

export interface DataProvider {
  fetchData(startRow: number, endRow: number, startCol: number, endCol: number): Promise<any[][]>;
  getTotalRows(): Promise<number>;
  getTotalColumns(): Promise<number>;
}

interface CellPosition {
  row: number;
  col: number;
}

export class SpreadsheetVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private columns: Column[];
  private dataProvider: DataProvider;
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

  // Hover state
  private hoverCell: CellPosition | null = null;
  private hoverColor: string = "rgba(0, 120, 212, 0.1)";
  private hoverBorderColor: string = "rgba(0, 120, 212, 0.5)";

  // Scrolling state
  private scrollY: number = 0;
  private scrollX: number = 0;
  private totalRows: number = 0;
  private totalColumns: number = 0;
  private visibleRows: number = 0;
  private visibleColumns: number = 0;
  private rowBuffer: number = 20; // Number of rows to keep in buffer
  private dataCache: Map<number, any[]> = new Map(); // Cache for fetched rows
  private isFetching: boolean = false;
  private lastFetchStart: number = 0;
  private lastFetchEnd: number = 0;

  constructor(
    canvas: HTMLCanvasElement,
    columns: Column[],
    dataProvider: DataProvider,
    options: Partial<SpreadsheetOptions> = {}
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.columns = columns;
    this.dataProvider = dataProvider;

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
      initialRowCount: 100,
      rowBuffer: 20,
      ...options,
    };

    this.rowBuffer = this.options.rowBuffer || 20;
    this.setupEventListeners();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Get total rows and columns
      this.totalRows = await this.dataProvider.getTotalRows();
      this.totalColumns = await this.dataProvider.getTotalColumns();

      // Calculate initial visible rows and columns
      this.calculateVisibleCells();

      // Calculate column widths
      await this.calculateColumnWidths();

      // Fetch initial data
      await this.fetchVisibleData();

      // Draw the initial view
      this.draw();
    } catch (error) {
      console.error("Error initializing spreadsheet:", error);
    }
  }

  private calculateVisibleCells(): void {
    const { cellHeight, headerHeight } = this.options;
    const canvasHeight = this.canvas.height - headerHeight;
    const canvasWidth = this.canvas.width - this.rowIndexWidth;

    this.visibleRows = Math.ceil(canvasHeight / cellHeight) + this.rowBuffer;
    this.visibleColumns = this.columns.length;
  }

  private async fetchVisibleData(): Promise<void> {
    if (this.isFetching) return;

    const startRow = Math.max(0, Math.floor(this.scrollY / this.options.cellHeight));
    const endRow = Math.min(
      this.totalRows,
      startRow + this.visibleRows
    );

    // Don't fetch if we already have this range
    if (startRow === this.lastFetchStart && endRow === this.lastFetchEnd) {
      return;
    }

    this.isFetching = true;
    try {
      const data = await this.dataProvider.fetchData(
        startRow,
        endRow,
        0,
        this.totalColumns - 1
      );

      // Update cache
      data.forEach((row, index) => {
        this.dataCache.set(startRow + index, row);
      });

      // Remove rows outside buffer
      const bufferStart = Math.max(0, startRow - this.rowBuffer);
      const bufferEnd = endRow + this.rowBuffer;
      for (const [rowIndex] of this.dataCache) {
        if (rowIndex < bufferStart || rowIndex >= bufferEnd) {
          this.dataCache.delete(rowIndex);
        }
      }

      this.lastFetchStart = startRow;
      this.lastFetchEnd = endRow;
      this.draw();
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      this.isFetching = false;
    }
  }

  private setupEventListeners(): void {
    window.addEventListener("resize", () => {
      this.calculateVisibleCells();
      this.fetchVisibleData();
      this.draw();
    });

    // Mouse events for selection and hover
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));

    // Scroll events
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));

    // Keyboard events for copy and navigation
    document.addEventListener("keydown", this.handleKeyDown.bind(this));
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const { cellHeight } = this.options;
    const deltaY = e.deltaY;
    const deltaX = e.deltaX;

    // Vertical scroll
    if (deltaY !== 0) {
      const newScrollY = Math.max(0, this.scrollY + deltaY);
      const maxScrollY = Math.max(0, (this.totalRows * cellHeight) - this.canvas.height);
      this.scrollY = Math.min(newScrollY, maxScrollY);
    }

    // Horizontal scroll
    if (deltaX !== 0) {
      const totalWidth = this.columnWidths.reduce((sum, width) => sum + width, 0) + this.rowIndexWidth;
      const newScrollX = Math.max(0, this.scrollX + deltaX);
      const maxScrollX = Math.max(0, totalWidth - this.canvas.width);
      this.scrollX = Math.min(newScrollX, maxScrollX);
    }

    this.fetchVisibleData();
    this.draw();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    // Handle Ctrl+C or Cmd+C
    if ((e.ctrlKey || e.metaKey) && e.key === "c") {
      this.copySelection().catch(console.error);
      return;
    }

    // Handle arrow keys for navigation
    const { cellHeight } = this.options;
    let newScrollY = this.scrollY;
    let newScrollX = this.scrollX;

    switch (e.key) {
      case "ArrowUp":
        newScrollY = Math.max(0, this.scrollY - cellHeight);
        break;
      case "ArrowDown":
        newScrollY = Math.min(
          (this.totalRows * cellHeight) - this.canvas.height,
          this.scrollY + cellHeight
        );
        break;
      case "ArrowLeft":
        newScrollX = Math.max(0, this.scrollX - 50);
        break;
      case "ArrowRight":
        newScrollX = Math.min(
          this.columnWidths.reduce((sum, width) => sum + width, 0) - this.canvas.width,
          this.scrollX + 50
        );
        break;
      case "PageUp":
        newScrollY = Math.max(0, this.scrollY - this.canvas.height);
        break;
      case "PageDown":
        newScrollY = Math.min(
          (this.totalRows * cellHeight) - this.canvas.height,
          this.scrollY + this.canvas.height
        );
        break;
      case "Home":
        newScrollY = 0;
        break;
      case "End":
        newScrollY = (this.totalRows * cellHeight) - this.canvas.height;
        break;
      default:
        return;
    }

    if (newScrollY !== this.scrollY || newScrollX !== this.scrollX) {
      this.scrollY = newScrollY;
      this.scrollX = newScrollX;
      this.fetchVisibleData();
      this.draw();
    }
  }

  private draw(): void {
    const { ctx, canvas, columns, options } = this;
    const { cellHeight, headerHeight, borderColor, borderWidth, rowIndexStyle } = options;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate visible range
    const startRow = Math.floor(this.scrollY / cellHeight);
    const visibleRowCount = Math.ceil(canvas.height / cellHeight);
    const endRow = Math.min(this.totalRows, startRow + visibleRowCount + this.rowBuffer);

    // Draw header (fixed)
    let currentX = -this.scrollX;
    
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
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      currentX = -this.scrollX;
      const rowY = headerHeight + (rowIndex * cellHeight) - this.scrollY;

      // Draw row index
      this.drawCell(currentX, rowY, this.rowIndexWidth, cellHeight, (rowIndex + 1).toString(), rowIndexStyle);
      currentX += this.rowIndexWidth;

      // Draw data cells
      const rowData = this.dataCache.get(rowIndex);
      if (rowData) {
        columns.forEach((column, colIndex) => {
          const width = this.columnWidths[colIndex];
          const value = rowData[colIndex]?.toString() ?? "";
          this.drawCell(currentX, rowY, width, cellHeight, value, options.defaultCellStyle);
          currentX += width;
        });
      }
    }

    // Draw selection
    this.drawSelection();

    // Draw hover
    this.drawHover();
  }

  private measureText(text: string, style: CellStyle): number {
    this.ctx.font = `${style.fontSize || 14}px ${style.fontFamily || "Arial"}`;
    const metrics = this.ctx.measureText(text);
    return metrics.width + (style.padding || 8) * 2 + this.padding;
  }

  private async calculateColumnWidths(): Promise<void> {
    const { headerStyle, defaultCellStyle } = this.options;

    // Calculate widths based on content
    const widths = await Promise.all(this.columns.map(async (column, colIndex) => {
      // Measure header width
      const headerWidth = this.measureText(column.header, headerStyle);

      // Measure data widths
      const data = await this.dataProvider.fetchData(0, Math.min(100, this.totalRows), colIndex, colIndex);
      const maxDataWidth = Math.max(
        ...data.map(row => {
          const value = row[0]?.toString() ?? "";
          return this.measureText(value, defaultCellStyle);
        })
      );

      // Use the larger of header width and max data width, but not less than minCellWidth
      return Math.max(headerWidth, maxDataWidth, this.minCellWidth);
    }));

    this.columnWidths = widths;
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
    if (row >= 0 && row < this.totalRows) {
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

  private handleMouseLeave(): void {
    this.isSelecting = false;
    this.hoverCell = null;
    this.draw();
  }

  private handleMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cell = this.getCellAtPosition(x, y);
    if (cell) {
      // If clicking on a selected cell, deselect
      if (this.isCellSelected(cell)) {
        this.selectionStart = null;
        this.selectionEnd = null;
      } else {
        this.isSelecting = true;
        this.selectionStart = cell;
        this.selectionEnd = cell;
      }
      this.draw();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const cell = this.getCellAtPosition(x, y);

    // Update hover state
    if (this.hoverCell?.row !== cell?.row || this.hoverCell?.col !== cell?.col) {
      this.hoverCell = cell;
      this.draw();
    }

    // Update selection if dragging
    if (this.isSelecting && this.selectionStart && cell) {
      this.selectionEnd = cell;
      this.draw();
    }
  }

  private handleMouseUp(): void {
    this.isSelecting = false;
  }

  private async copySelection(): Promise<void> {
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
    const data = await this.dataProvider.fetchData(
      Math.max(0, startRow),
      endRow,
      Math.max(0, startCol),
      endCol
    );

    for (let row = 0; row < data.length; row++) {
      const cells: string[] = [];
      for (let col = startCol; col <= endCol; col++) {
        if (col === -1) {
          cells.push((startRow + row + 1).toString());
        } else {
          const value = data[row][col - Math.max(0, startCol)]?.toString() ?? "";
          cells.push(value);
        }
      }
      rows.push(cells.join("\t"));
    }

    const text = rows.join("\n");
    try {
      await navigator.clipboard.writeText(text);
      console.log("Selection copied to clipboard");
    } catch (err) {
      console.error("Failed to copy selection:", err);
    }
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

  private drawHover(): void {
    if (!this.hoverCell) return;

    const { headerHeight, cellHeight } = this.options;
    const { row, col } = this.hoverCell;

    // Don't draw hover if cell is selected
    if (this.isCellSelected(this.hoverCell)) return;

    const y = row === -1 ? 0 : headerHeight + row * cellHeight;
    const height = row === -1 ? headerHeight : cellHeight;
    const x = this.getColumnX(col);
    const width = col === -1 ? this.rowIndexWidth : this.columnWidths[col];

    // Draw hover background
    this.ctx.fillStyle = this.hoverColor;
    this.ctx.fillRect(x, y, width, height);

    // Draw hover border
    this.ctx.strokeStyle = this.hoverBorderColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);
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

  private isCellSelected(cell: CellPosition): boolean {
    if (!this.selectionStart || !this.selectionEnd) return false;

    const startRow = Math.min(this.selectionStart.row, this.selectionEnd.row);
    const endRow = Math.max(this.selectionStart.row, this.selectionEnd.row);
    const startCol = Math.min(this.selectionStart.col, this.selectionEnd.col);
    const endCol = Math.max(this.selectionStart.col, this.selectionEnd.col);

    return cell.row >= startRow && cell.row <= endRow && cell.col >= startCol && cell.col <= endCol;
  }
}
