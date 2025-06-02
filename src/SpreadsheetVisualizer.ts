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
  // Type-specific styles
  numericColor?: string;
  dateColor?: string;
  nullColor?: string;
}

export interface SpreadsheetOptions {
  cellHeight: number;
  headerHeight: number;
  defaultCellStyle: CellStyle;
  headerStyle: CellStyle;
  rowIndexStyle: CellStyle;
  // Type-specific default styles
  numericStyle?: Partial<CellStyle>;
  dateStyle?: Partial<CellStyle>;
  nullStyle?: Partial<CellStyle>;
  borderColor: string;
  borderWidth: number;
  initialRowCount?: number; // Number of rows to fetch initially
  rowBuffer?: number; // Number of rows to keep in buffer
  // Viewport options
  maxHeight?: number; // Maximum height of the visualization
  maxWidth?: number; // Maximum width of the visualization
  minHeight?: number; // Minimum height of the visualization
  minWidth?: number; // Minimum width of the visualization
  height?: number; // Fixed height (if specified)
  width?: number; // Fixed width (if specified)
  scrollbarWidth?: number; // Width of the scrollbars
  scrollbarColor?: string; // Color of the scrollbar track
  scrollbarThumbColor?: string; // Color of the scrollbar thumb
  scrollbarHoverColor?: string; // Color of the scrollbar thumb on hover
  // Global format options
  dateFormat?: string | Intl.DateTimeFormatOptions;
  datetimeFormat?: string | Intl.DateTimeFormatOptions;
  numberFormat?: string | Intl.NumberFormatOptions;
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

  // Scrollbar state
  private scrollbarWidth: number = 12;
  private scrollbarColor: string = "#e0e0e0";
  private scrollbarThumbColor: string = "#bdbdbd";
  private scrollbarHoverColor: string = "#9e9e9e";
  private isHoveringVerticalScrollbar: boolean = false;
  private isHoveringHorizontalScrollbar: boolean = false;
  private isDraggingVerticalScrollbar: boolean = false;
  private isDraggingHorizontalScrollbar: boolean = false;
  private lastMouseY: number = 0;
  private lastMouseX: number = 0;

  constructor(canvas: HTMLCanvasElement, columns: Column[], dataProvider: DataProvider, options: Partial<SpreadsheetOptions> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.columns = columns;
    this.dataProvider = dataProvider;

    // Default options with monospaced font and default formats
    this.options = {
      cellHeight: 30,
      headerHeight: 40,
      defaultCellStyle: {
        backgroundColor: "#ffffff",
        textColor: "#000000",
        fontSize: 14,
        fontFamily: "Consolas, 'Courier New', monospace",
        textAlign: "left",
        padding: 8,
        numericColor: "#0066cc",
        dateColor: "#006633",
        nullColor: "#cc0000",
      },
      headerStyle: {
        backgroundColor: "#f0f0f0",
        textColor: "#000000",
        fontSize: 14,
        fontFamily: "Consolas, 'Courier New', monospace",
        textAlign: "center",
        padding: 8,
      },
      rowIndexStyle: {
        backgroundColor: "#f8f9fa",
        textColor: "#6c757d",
        fontSize: 14,
        fontFamily: "Consolas, 'Courier New', monospace",
        textAlign: "center",
        padding: 8,
      },
      // Default formats
      dateFormat: "yyyy-MM-dd",
      datetimeFormat: "yyyy-MM-dd HH:mm:ss",
      numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      borderColor: "#e0e0e0",
      borderWidth: 1,
      initialRowCount: 100,
      rowBuffer: 20,
      // Default viewport constraints
      maxHeight: 600,
      maxWidth: 800,
      minHeight: 200,
      minWidth: 300,
      ...options,
    };

    // Update scrollbar options
    this.scrollbarWidth = options.scrollbarWidth || 12;
    this.scrollbarColor = options.scrollbarColor || "#e0e0e0";
    this.scrollbarThumbColor = options.scrollbarThumbColor || "#bdbdbd";
    this.scrollbarHoverColor = options.scrollbarHoverColor || "#9e9e9e";

    this.rowBuffer = this.options.rowBuffer || 20;
    this.setupEventListeners();
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      // Set initial canvas size
      this.updateCanvasSize();

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
    const endRow = Math.min(this.totalRows, startRow + this.visibleRows);

    // Don't fetch if we already have this range
    if (startRow === this.lastFetchStart && endRow === this.lastFetchEnd) {
      return;
    }

    this.isFetching = true;
    try {
      const data = await this.dataProvider.fetchData(startRow, endRow, 0, this.totalColumns - 1);

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
    // Update resize handler to respect viewport constraints and recalculate column widths
    window.addEventListener("resize", () => {
      this.updateCanvasSize();
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

    // Add scrollbar interaction events
    this.canvas.addEventListener("mousedown", this.handleScrollbarMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleScrollbarMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleScrollbarMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleScrollbarMouseLeave.bind(this));
  }

  private handleWheel(e: WheelEvent): void {
    e.preventDefault();

    const { cellHeight } = this.options;
    const deltaY = e.deltaY;
    const deltaX = e.deltaX;

    // Vertical scroll
    if (deltaY !== 0) {
      const newScrollY = Math.max(0, this.scrollY + deltaY);
      const maxScrollY = Math.max(0, this.totalRows * cellHeight - this.canvas.height);
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
        newScrollY = Math.min(this.totalRows * cellHeight - this.canvas.height, this.scrollY + cellHeight);
        break;
      case "ArrowLeft":
        newScrollX = Math.max(0, this.scrollX - 50);
        break;
      case "ArrowRight":
        newScrollX = Math.min(this.columnWidths.reduce((sum, width) => sum + width, 0) - this.canvas.width, this.scrollX + 50);
        break;
      case "PageUp":
        newScrollY = Math.max(0, this.scrollY - this.canvas.height);
        break;
      case "PageDown":
        newScrollY = Math.min(this.totalRows * cellHeight - this.canvas.height, this.scrollY + this.canvas.height);
        break;
      case "Home":
        newScrollY = 0;
        break;
      case "End":
        newScrollY = this.totalRows * cellHeight - this.canvas.height;
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

    // Calculate visible area (excluding scrollbars)
    const visibleWidth = this.needsVerticalScrollbar() ? canvas.width - this.scrollbarWidth : canvas.width;
    const visibleHeight = this.needsHorizontalScrollbar() ? canvas.height - this.scrollbarWidth : canvas.height;

    // Recalculate column widths to fill available space
    this.calculateColumnWidths();

    // Calculate visible range
    const startRow = Math.floor(this.scrollY / cellHeight);
    const visibleRowCount = Math.ceil(visibleHeight / cellHeight);
    const endRow = Math.min(this.totalRows, startRow + visibleRowCount + this.rowBuffer);

    // Draw header (fixed)
    let currentX = -this.scrollX;

    // Draw row index header
    this.drawCell(currentX, 0, this.rowIndexWidth, headerHeight, "#", rowIndexStyle);
    currentX += this.rowIndexWidth;

    // Draw column headers
    columns.forEach((column, index) => {
      const width = this.columnWidths[index];
      if (currentX + width > 0 && currentX < visibleWidth) {
        this.drawCell(currentX, 0, width, headerHeight, column.header, options.headerStyle);
      }
      currentX += width;
    });

    // Draw data rows
    for (let rowIndex = startRow; rowIndex < endRow; rowIndex++) {
      currentX = -this.scrollX;
      const rowY = headerHeight + rowIndex * cellHeight - this.scrollY;

      // Only draw if row is visible
      if (rowY + cellHeight > 0 && rowY < visibleHeight) {
        // Draw row index
        this.drawCell(currentX, rowY, this.rowIndexWidth, cellHeight, (rowIndex + 1).toString(), rowIndexStyle);
        currentX += this.rowIndexWidth;

        // Draw data cells
        const rowData = this.dataCache.get(rowIndex);
        if (rowData) {
          columns.forEach((column, colIndex) => {
            const width = this.columnWidths[colIndex];
            if (currentX + width > 0 && currentX < visibleWidth) {
              const value = rowData[colIndex];
              this.drawCell(currentX, rowY, width, cellHeight, value, options.defaultCellStyle, column);
            }
            currentX += width;
          });
        }
      }
    }

    // Draw selection
    this.drawSelection();

    // Draw hover
    this.drawHover();

    // Draw scrollbars on top
    this.drawScrollbars();
  }

  private measureText(text: string, style: CellStyle): number {
    this.ctx.font = `${style.fontSize || 14}px ${style.fontFamily || "Arial"}`;
    const metrics = this.ctx.measureText(text);
    return metrics.width + (style.padding || 8) * 2 + this.padding;
  }

  private calculateColumnWidths(): void {
    const { headerStyle, defaultCellStyle } = this.options;
    const availableWidth = this.canvas.width - (this.needsVerticalScrollbar() ? this.scrollbarWidth : 0) - this.rowIndexWidth;

    // First, calculate minimum widths based on content
    const minWidths = this.columns.map((column, colIndex) => {
      // Measure header width
      const headerWidth = this.measureText(column.header, headerStyle);

      // Measure data widths (using cached data)
      const maxDataWidth = Math.max(
        ...Array.from(this.dataCache.values()).map((row) => {
          const value = row[colIndex]?.toString() ?? "";
          return this.measureText(value, defaultCellStyle);
        })
      );

      // Use the larger of header width and max data width, but not less than minCellWidth
      return Math.max(headerWidth, maxDataWidth, this.minCellWidth);
    });

    // Calculate total minimum width
    const totalMinWidth = minWidths.reduce((sum, width) => sum + width, 0);

    // If total minimum width is less than available width, distribute extra space
    if (totalMinWidth < availableWidth) {
      const extraWidth = availableWidth - totalMinWidth;
      const extraPerColumn = extraWidth / this.columns.length;
      this.columnWidths = minWidths.map((width) => width + extraPerColumn);
    } else {
      // If content is wider than available space, scale down proportionally
      const scale = availableWidth / totalMinWidth;
      this.columnWidths = minWidths.map((width) => Math.max(this.minCellWidth, width * scale));
    }
  }

  private getCellAtPosition(x: number, y: number): CellPosition | null {
    const { headerHeight, cellHeight } = this.options;
    const scrollbarWidth = this.needsVerticalScrollbar() ? this.scrollbarWidth : 0;

    // Adjust x for horizontal scroll
    const adjustedX = x + this.scrollX;

    // Check if click is in header row
    if (y < headerHeight) {
      const col = this.getColumnAtX(adjustedX);
      return col !== null ? { row: -1, col } : null;
    }

    // Check if click is in data rows
    const adjustedY = y + this.scrollY;
    const row = Math.floor((adjustedY - headerHeight) / cellHeight);
    if (row >= 0 && row < this.totalRows) {
      const col = this.getColumnAtX(adjustedX);
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
    const data = await this.dataProvider.fetchData(Math.max(0, startRow), endRow, Math.max(0, startCol), endCol);

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
    const visibleWidth = this.needsVerticalScrollbar() ? this.canvas.width - this.scrollbarWidth : this.canvas.width;
    const visibleHeight = this.needsHorizontalScrollbar() ? this.canvas.height - this.scrollbarWidth : this.canvas.height;

    // Draw selection rectangles
    for (let row = startRow; row <= endRow; row++) {
      const rowY = row === -1 ? 0 : headerHeight + row * cellHeight - this.scrollY;

      // Skip if row is not visible
      if (rowY + cellHeight < 0 || rowY > visibleHeight) continue;

      const height = row === -1 ? headerHeight : cellHeight;

      for (let col = startCol; col <= endCol; col++) {
        const x = this.getColumnX(col) - this.scrollX;
        const width = col === -1 ? this.rowIndexWidth : this.columnWidths[col];

        // Skip if column is not visible
        if (x + width < 0 || x > visibleWidth) continue;

        // Draw selection background
        this.ctx.fillStyle = this.selectionColor;
        this.ctx.fillRect(x, rowY, width, height);

        // Draw selection border
        this.ctx.strokeStyle = this.selectionBorderColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, rowY, width, height);
      }
    }
  }

  private drawHover(): void {
    if (!this.hoverCell) return;

    const { headerHeight, cellHeight } = this.options;
    const { row, col } = this.hoverCell;
    const visibleWidth = this.needsVerticalScrollbar() ? this.canvas.width - this.scrollbarWidth : this.canvas.width;
    const visibleHeight = this.needsHorizontalScrollbar() ? this.canvas.height - this.scrollbarWidth : this.canvas.height;

    // Don't draw hover if cell is selected
    if (this.isCellSelected(this.hoverCell)) return;

    const rowY = row === -1 ? 0 : headerHeight + row * cellHeight - this.scrollY;
    const height = row === -1 ? headerHeight : cellHeight;
    const x = this.getColumnX(col) - this.scrollX;
    const width = col === -1 ? this.rowIndexWidth : this.columnWidths[col];

    // Skip if cell is not visible
    if (rowY + height < 0 || rowY > visibleHeight || x + width < 0 || x > visibleWidth) return;

    // Draw hover background
    this.ctx.fillStyle = this.hoverColor;
    this.ctx.fillRect(x, rowY, width, height);

    // Draw hover border
    this.ctx.strokeStyle = this.hoverBorderColor;
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, rowY, width, height);
  }

  private drawCell(x: number, y: number, width: number, height: number, value: any, style: CellStyle, column?: Column): void {
    const { ctx, canvas, options } = this;
    const { borderColor, borderWidth } = options;

    // Draw cell background
    ctx.fillStyle = style.backgroundColor || "#ffffff";
    ctx.fillRect(x, y, width, height);

    // Draw cell border
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = borderWidth;
    ctx.strokeRect(x, y, width, height);

    // Format and style the cell value
    const { text, style: typeStyle } = column ? this.formatCellValue(value, column) : { text: value, style: {} };
    const finalStyle = { ...style, ...typeStyle };

    // Draw text with monospaced font
    ctx.fillStyle = finalStyle.textColor || "#000000";
    ctx.font = `${finalStyle.fontSize || 14}px ${finalStyle.fontFamily || "Consolas, 'Courier New', monospace"}`;
    ctx.textAlign = finalStyle.textAlign || "left";

    const padding = finalStyle.padding || 8;
    let textX = x + padding;
    if (finalStyle.textAlign === "center") {
      textX = x + width / 2;
    } else if (finalStyle.textAlign === "right") {
      textX = x + width - padding;
    }

    // Clip text to cell width
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + borderWidth, y + borderWidth, width - borderWidth * 2, height - borderWidth * 2);
    ctx.clip();

    // Draw text with vertical centering
    const textY = y + (height + (finalStyle.fontSize || 14)) / 2;
    ctx.fillText(text, textX, textY);
    ctx.restore();
  }

  private parseFormat(format: string | undefined, type: "number" | "date" | "datetime"): any {
    if (!format) return undefined;

    try {
      // First try parsing as JSON
      return JSON.parse(format);
    } catch (e) {
      // If not JSON, handle as direct format string
      if (type === "date" || type === "datetime") {
        // Common date format patterns
        const formatMap: { [key: string]: Intl.DateTimeFormatOptions } = {
          "yyyy-MM-dd": { year: "numeric", month: "2-digit", day: "2-digit" },
          "dd/MM/yyyy": { day: "2-digit", month: "2-digit", year: "numeric" },
          "MM/dd/yyyy": { month: "2-digit", day: "2-digit", year: "numeric" },
          "yyyy/MM/dd": { year: "numeric", month: "2-digit", day: "2-digit" },
          "dd-MM-yyyy": { day: "2-digit", month: "2-digit", year: "numeric" },
          "MM-dd-yyyy": { month: "2-digit", day: "2-digit", year: "numeric" },
          yyyyMMdd: { year: "numeric", month: "2-digit", day: "2-digit" },
          ddMMyyyy: { day: "2-digit", month: "2-digit", year: "numeric" },
          MMddyyyy: { month: "2-digit", day: "2-digit", year: "numeric" },
          "yyyy-MM-dd HH:mm:ss": {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          },
          "dd/MM/yyyy HH:mm:ss": {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          },
        };

        // Try to match the format string with known patterns
        const matchedFormat = formatMap[format];
        if (matchedFormat) {
          return matchedFormat;
        }

        // If no match found, try to parse as a simple date format
        if (format.includes("yyyy") || format.includes("MM") || format.includes("dd")) {
          return {
            year: format.includes("yyyy") ? "numeric" : undefined,
            month: format.includes("MM") ? "2-digit" : undefined,
            day: format.includes("dd") ? "2-digit" : undefined,
            hour: format.includes("HH") ? "2-digit" : undefined,
            minute: format.includes("mm") ? "2-digit" : undefined,
            second: format.includes("ss") ? "2-digit" : undefined,
          };
        }
      }

      // For number formats, return undefined if not valid JSON
      return undefined;
    }
  }

  private getFormatOptions(column: Column, type: "number" | "date" | "datetime"): any {
    // First try column-specific format
    if (column.format) {
      const parsedFormat = this.parseFormat(column.format, type);
      if (parsedFormat) return parsedFormat;
    }

    // Then fall back to global format
    switch (type) {
      case "date":
        return this.parseFormat(this.options.dateFormat?.toString(), "date");
      case "datetime":
        return this.parseFormat(this.options.datetimeFormat?.toString(), "date");
      case "number":
        return this.parseFormat(this.options.numberFormat?.toString(), "number");
      default:
        return undefined;
    }
  }

  private formatCellValue(value: any, column: Column): { text: string; style: Partial<CellStyle> } {
    if (value === null || value === undefined) {
      return {
        text: "NA",
        style: this.options.nullStyle || { textColor: "#cc0000" },
      };
    }

    switch (column.dataType) {
      case "integer":
      case "decimal":
        const numValue = Number(value);
        if (!isNaN(numValue)) {
          const formatOptions = this.getFormatOptions(column, "number");
          const formattedValue = formatOptions ? new Intl.NumberFormat(undefined, formatOptions).format(numValue) : numValue.toString();
          return {
            text: formattedValue,
            style: this.options.numericStyle || { textAlign: "right", textColor: "#0066cc" },
          };
        }
        break;

      case "date":
      case "datetime":
        if (value instanceof Date || !isNaN(Date.parse(value))) {
          const dateValue = new Date(value);
          const formatOptions = this.getFormatOptions(column, column.dataType);
          const formattedValue = formatOptions
            ? new Intl.DateTimeFormat(undefined, formatOptions).format(dateValue)
            : column.dataType === "date"
            ? dateValue.toLocaleDateString()
            : dateValue.toLocaleString();
          return {
            text: formattedValue,
            style: this.options.dateStyle || { textAlign: "right", textColor: "#006633" },
          };
        }
        break;

      case "boolean":
        return {
          text: value ? "Yes" : "No",
          style: { textAlign: "center" },
        };

      case "string":
      default:
        return {
          text: value.toString(),
          style: {},
        };
    }

    // If type conversion fails, treat as string
    return {
      text: value.toString(),
      style: {},
    };
  }

  private isCellSelected(cell: CellPosition): boolean {
    if (!this.selectionStart || !this.selectionEnd) return false;

    const startRow = Math.min(this.selectionStart.row, this.selectionEnd.row);
    const endRow = Math.max(this.selectionStart.row, this.selectionEnd.row);
    const startCol = Math.min(this.selectionStart.col, this.selectionEnd.col);
    const endCol = Math.max(this.selectionStart.col, this.selectionEnd.col);

    return cell.row >= startRow && cell.row <= endRow && cell.col >= startCol && cell.col <= endCol;
  }

  private updateCanvasSize(): void {
    const { maxHeight, maxWidth, minHeight, minWidth, height, width } = this.options;

    // If fixed dimensions are specified, use them
    if (height !== undefined) {
      this.canvas.height = height;
    } else {
      // Calculate height based on container and constraints
      const containerHeight = this.canvas.parentElement?.clientHeight || window.innerHeight;
      this.canvas.height = Math.min(Math.max(containerHeight, minHeight || 0), maxHeight || containerHeight);
    }

    if (width !== undefined) {
      this.canvas.width = width;
    } else {
      // Calculate width based on container and constraints
      const containerWidth = this.canvas.parentElement?.clientWidth || window.innerWidth;
      this.canvas.width = Math.min(Math.max(containerWidth, minWidth || 0), maxWidth || containerWidth);
    }

    // Update canvas style to maintain aspect ratio and prevent stretching
    this.canvas.style.width = `${this.canvas.width}px`;
    this.canvas.style.height = `${this.canvas.height}px`;

    // Recalculate column widths to fit new canvas size
    this.calculateColumnWidths();
  }

  private handleScrollbarMouseDown(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if click is on vertical scrollbar
    if (this.isPointInVerticalScrollbar(x, y)) {
      this.isDraggingVerticalScrollbar = true;
      this.lastMouseY = y;
      e.preventDefault();
      return;
    }

    // Check if click is on horizontal scrollbar
    if (this.isPointInHorizontalScrollbar(x, y)) {
      this.isDraggingHorizontalScrollbar = true;
      this.lastMouseX = x;
      e.preventDefault();
      return;
    }

    // If not clicking on scrollbars, handle normal cell selection
    this.handleMouseDown(e);
  }

  private handleScrollbarMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Update hover states
    this.isHoveringVerticalScrollbar = this.isPointInVerticalScrollbar(x, y);
    this.isHoveringHorizontalScrollbar = this.isPointInHorizontalScrollbar(x, y);

    // Handle dragging
    if (this.isDraggingVerticalScrollbar) {
      const deltaY = y - this.lastMouseY;
      const scrollRatio = deltaY / this.getVerticalScrollbarHeight();
      const scrollDelta = scrollRatio * (this.totalRows * this.options.cellHeight - this.canvas.height);
      this.scrollY = Math.max(0, Math.min(this.scrollY + scrollDelta, this.getMaxScrollY()));
      this.lastMouseY = y;
      this.fetchVisibleData();
      this.draw();
      e.preventDefault();
      return;
    }

    if (this.isDraggingHorizontalScrollbar) {
      const deltaX = x - this.lastMouseX;
      const scrollRatio = deltaX / this.getHorizontalScrollbarWidth();
      const scrollDelta = scrollRatio * (this.getTotalWidth() - this.canvas.width);
      this.scrollX = Math.max(0, Math.min(this.scrollX + scrollDelta, this.getMaxScrollX()));
      this.lastMouseX = x;
      this.draw();
      e.preventDefault();
      return;
    }

    // If not dragging scrollbars, handle normal cell hover
    this.handleMouseMove(e);
  }

  private handleScrollbarMouseUp(): void {
    this.isDraggingVerticalScrollbar = false;
    this.isDraggingHorizontalScrollbar = false;
  }

  private handleScrollbarMouseLeave(): void {
    this.isDraggingVerticalScrollbar = false;
    this.isDraggingHorizontalScrollbar = false;
    this.isHoveringVerticalScrollbar = false;
    this.isHoveringHorizontalScrollbar = false;
    this.draw();
  }

  private isPointInVerticalScrollbar(x: number, y: number): boolean {
    return x >= this.canvas.width - this.scrollbarWidth && y >= 0 && y <= this.canvas.height;
  }

  private isPointInHorizontalScrollbar(x: number, y: number): boolean {
    return y >= this.canvas.height - this.scrollbarWidth && x >= 0 && x <= this.canvas.width;
  }

  private getVerticalScrollbarHeight(): number {
    return this.canvas.height - (this.needsHorizontalScrollbar() ? this.scrollbarWidth : 0);
  }

  private getHorizontalScrollbarWidth(): number {
    return this.canvas.width - (this.needsVerticalScrollbar() ? this.scrollbarWidth : 0);
  }

  private getVerticalScrollbarThumbHeight(): number {
    const contentHeight = this.totalRows * this.options.cellHeight;
    const viewportHeight = this.canvas.height - this.options.headerHeight;
    return Math.max(30, (viewportHeight / contentHeight) * this.getVerticalScrollbarHeight());
  }

  private getHorizontalScrollbarThumbWidth(): number {
    const contentWidth = this.getTotalWidth();
    const viewportWidth = this.canvas.width - this.rowIndexWidth;
    return Math.max(30, (viewportWidth / contentWidth) * this.getHorizontalScrollbarWidth());
  }

  private getVerticalScrollbarThumbY(): number {
    const scrollRatio = this.scrollY / (this.totalRows * this.options.cellHeight - this.canvas.height);
    return scrollRatio * (this.getVerticalScrollbarHeight() - this.getVerticalScrollbarThumbHeight());
  }

  private getHorizontalScrollbarThumbX(): number {
    const scrollRatio = this.scrollX / (this.getTotalWidth() - this.canvas.width);
    return scrollRatio * (this.getHorizontalScrollbarWidth() - this.getHorizontalScrollbarThumbWidth());
  }

  private needsVerticalScrollbar(): boolean {
    return this.totalRows * this.options.cellHeight > this.canvas.height;
  }

  private needsHorizontalScrollbar(): boolean {
    return this.getTotalWidth() > this.canvas.width;
  }

  private getTotalWidth(): number {
    return this.columnWidths.reduce((sum, width) => sum + width, 0) + this.rowIndexWidth;
  }

  private getMaxScrollY(): number {
    return Math.max(0, this.totalRows * this.options.cellHeight - this.canvas.height);
  }

  private getMaxScrollX(): number {
    return Math.max(0, this.getTotalWidth() - this.canvas.width);
  }

  private drawScrollbars(): void {
    const { ctx } = this;

    // Draw vertical scrollbar
    if (this.needsVerticalScrollbar()) {
      const scrollbarX = this.canvas.width - this.scrollbarWidth;
      const scrollbarHeight = this.getVerticalScrollbarHeight();

      // Draw track
      ctx.fillStyle = this.scrollbarColor;
      ctx.fillRect(scrollbarX, 0, this.scrollbarWidth, scrollbarHeight);

      // Draw thumb
      const thumbHeight = this.getVerticalScrollbarThumbHeight();
      const thumbY = this.getVerticalScrollbarThumbY();
      ctx.fillStyle = this.isHoveringVerticalScrollbar ? this.scrollbarHoverColor : this.scrollbarThumbColor;
      ctx.fillRect(scrollbarX, thumbY, this.scrollbarWidth, thumbHeight);
    }

    // Draw horizontal scrollbar
    if (this.needsHorizontalScrollbar()) {
      const scrollbarY = this.canvas.height - this.scrollbarWidth;
      const scrollbarWidth = this.getHorizontalScrollbarWidth();

      // Draw track
      ctx.fillStyle = this.scrollbarColor;
      ctx.fillRect(0, scrollbarY, scrollbarWidth, this.scrollbarWidth);

      // Draw thumb
      const thumbWidth = this.getHorizontalScrollbarThumbWidth();
      const thumbX = this.getHorizontalScrollbarThumbX();
      ctx.fillStyle = this.isHoveringHorizontalScrollbar ? this.scrollbarHoverColor : this.scrollbarThumbColor;
      ctx.fillRect(thumbX, scrollbarY, thumbWidth, this.scrollbarWidth);
    }
  }
}
