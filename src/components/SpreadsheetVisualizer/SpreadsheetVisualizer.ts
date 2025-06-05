import {
  DEFAULT_MAX_WIDTH,
  DEFAULT_MIN_HEIGHT,
  DEFAULT_MIN_WIDTH,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_CELL_PADDING,
  DEFAULT_ROW_HEADER_WIDTH,
  DEFAULT_MIN_CELL_WIDTH,
  DEFAULT_FONT_FAMILY,
  DEFAULT_HEADER_FONT_SIZE,
  DEFAULT_FONT_SIZE,
  DEFAULT_HEADER_BACKGROUND_COLOR,
  DEFAULT_HEADER_TEXT_COLOR,
  DEFAULT_CELL_BACKGROUND_COLOR,
  DEFAULT_CELL_TEXT_COLOR,
  DEFAULT_BORDER_COLOR,
  DEFAULT_SELECTION_COLOR,
  DEFAULT_HOVER_COLOR,
  DEFAULT_SCROLLBAR_THUMB_COLOR,
  DEFAULT_SCROLLBAR_HOVER_COLOR,
  DEFAULT_SCROLLBAR_COLOR,
  DEFAULT_SCROLLBAR_WIDTH,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATETIME_FORMAT,
  DEFAULT_NUMBER_FORMAT,
  DEFAULT_BORDER_WIDTH,
} from "../dafults";
import { DEFAULT_MAX_HEIGHT } from "../dafults";
import { Column, SpreadsheetOptions, DataProvider } from "./types";
import { throttle } from "./utils/throttle";

type RequiredSpreadsheetOptions = Omit<Required<SpreadsheetOptions>, "height" | "width"> & {
  height: number;
  width: number;
};

enum MouseState {
  Idle,
  Dragging,
  Hovering,
  HoveringVerticalScrollbar,
  HoveringHorizontalScrollbar,
  DraggingVerticalScrollbar,
  DraggingHorizontalScrollbar,
}

export class SpreadsheetVisualizer {
  private canvas: HTMLCanvasElement;
  private selectionCanvas: HTMLCanvasElement;
  private hoverCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private selectionCtx: CanvasRenderingContext2D;
  private hoverCtx: CanvasRenderingContext2D;
  private columns: Column[];
  private dataProvider: DataProvider;
  private options: RequiredSpreadsheetOptions;
  private throttledMouseMove: (event: MouseEvent) => void;

  // State variables
  private scrollX = 0;
  private scrollY = 0;
  private hoveredCell: { row: number; col: number } | null = null;
  private selectedCells: { startRow: number; endRow: number; startCol: number; endCol: number } | null = null;
  private mouseState = MouseState.Idle;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastScrollX = 0;
  private lastScrollY = 0;

  // Cache
  private columnWidths: number[] = [];
  private totalWidth = 0;
  private totalHeight = 0;
  private visibleRows = 0;
  private visibleColumns = 0;
  private dataCache: Map<string, any[][]> = new Map();

  constructor(canvas: HTMLCanvasElement, columns: Column[], dataProvider: DataProvider, options: Partial<SpreadsheetOptions> = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;

    // Create and setup an overlay canvas for selection
    this.selectionCanvas = document.createElement("canvas");
    this.selectionCanvas.style.position = "absolute";
    this.selectionCanvas.style.top = "0";
    this.selectionCanvas.style.left = "0";
    this.selectionCanvas.style.pointerEvents = "none"; // Allow mouse events to pass through to main canvas
    this.selectionCtx = this.selectionCanvas.getContext("2d", { alpha: true })!;

    // Insert overlay canvas after the main canvas
    canvas.parentElement?.insertBefore(this.selectionCanvas, canvas.nextSibling);

    // Create and setup an overlay canvas for hover
    this.hoverCanvas = document.createElement("canvas");
    this.hoverCanvas.style.position = "absolute";
    this.hoverCanvas.style.top = "0";
    this.hoverCanvas.style.left = "0";
    this.hoverCanvas.style.pointerEvents = "none"; // Allow mouse events to pass through to main canvas
    this.hoverCtx = this.hoverCanvas.getContext("2d", { alpha: true })!;

    this.columns = columns;
    this.dataProvider = dataProvider;

    // Get container dimensions
    const container = canvas.parentElement;
    const containerRect = container?.getBoundingClientRect();
    const containerWidth = containerRect?.width ?? options.maxWidth ?? DEFAULT_MAX_WIDTH;
    const containerHeight = containerRect?.height ?? options.maxHeight ?? DEFAULT_MAX_HEIGHT;

    // Set default options
    this.options = {
      // Viewport options
      maxHeight: options.maxHeight ?? DEFAULT_MAX_HEIGHT,
      maxWidth: options.maxWidth ?? DEFAULT_MAX_WIDTH,
      minHeight: options.minHeight ?? DEFAULT_MIN_HEIGHT,
      minWidth: options.minWidth ?? DEFAULT_MIN_WIDTH,
      height: options.height ?? containerWidth,
      width: options.width ?? containerHeight,

      // Cell options
      cellHeight: options.cellHeight ?? DEFAULT_CELL_HEIGHT,
      minCellWidth: options.minCellWidth ?? DEFAULT_MIN_CELL_WIDTH,
      cellPadding: options.cellPadding ?? DEFAULT_CELL_PADDING,
      rowHeaderWidth: options.rowHeaderWidth ?? DEFAULT_ROW_HEADER_WIDTH,

      // Style options
      borderWidth: options.borderWidth ?? DEFAULT_BORDER_WIDTH,
      fontFamily: options.fontFamily ?? DEFAULT_FONT_FAMILY,
      fontSize: options.fontSize ?? DEFAULT_FONT_SIZE,
      headerFontSize: options.headerFontSize ?? DEFAULT_HEADER_FONT_SIZE,
      headerBackgroundColor: options.headerBackgroundColor ?? DEFAULT_HEADER_BACKGROUND_COLOR,
      headerTextColor: options.headerTextColor ?? DEFAULT_HEADER_TEXT_COLOR,
      cellBackgroundColor: options.cellBackgroundColor ?? DEFAULT_CELL_BACKGROUND_COLOR,
      cellTextColor: options.cellTextColor ?? DEFAULT_CELL_TEXT_COLOR,
      borderColor: options.borderColor ?? DEFAULT_BORDER_COLOR,
      selectionColor: options.selectionColor ?? DEFAULT_SELECTION_COLOR,
      hoverColor: options.hoverColor ?? DEFAULT_HOVER_COLOR,

      // Scrollbar options
      scrollbarWidth: options.scrollbarWidth ?? DEFAULT_SCROLLBAR_WIDTH,
      scrollbarColor: options.scrollbarColor ?? DEFAULT_SCROLLBAR_COLOR,
      scrollbarThumbColor: options.scrollbarThumbColor ?? DEFAULT_SCROLLBAR_THUMB_COLOR,
      scrollbarHoverColor: options.scrollbarHoverColor ?? DEFAULT_SCROLLBAR_HOVER_COLOR,

      // Format options
      dateFormat: options.dateFormat ?? DEFAULT_DATE_FORMAT,
      datetimeFormat: options.datetimeFormat ?? DEFAULT_DATETIME_FORMAT,
      numberFormat: options.numberFormat ?? DEFAULT_NUMBER_FORMAT,
    };

    // Apply constraints
    this.options.height = Math.min(Math.max(this.options.height, this.options.minHeight), this.options.maxHeight);
    this.options.width = Math.min(Math.max(this.options.width, this.options.minWidth), this.options.maxWidth);

    // Initialize throttled mouse move handler (16ms = ~60fps)
    this.throttledMouseMove = throttle(this.handleMouseMove.bind(this), 16);

    this.setupEventListeners();
    this.updateCanvasSize();
    this.calculateColumnWidths();
    this.draw();
  }

  private setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener("mousedown", (event) => this.handleMouseDown(event).catch(console.error));
    this.canvas.addEventListener("mousemove", this.throttledMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));
    this.canvas.addEventListener("wheel", (event) => this.handleWheel(event).catch(console.error));

    // Keyboard events
    window.addEventListener("keydown", (event) => this.handleKeyDown(event).catch(console.error));

    // Window events
    window.addEventListener("resize", () => this.handleResize().catch(console.error));
  }

  private async updateCanvasSize() {
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;

    // Calculate canvas dimensions based on options and container size
    let width = this.options.width ?? containerWidth;
    let height = this.options.height ?? containerHeight;

    // Apply constraints
    width = Math.min(Math.max(width, this.options.minWidth), this.options.maxWidth);
    height = Math.min(Math.max(height, this.options.minHeight), this.options.maxHeight);

    // Update both canvases
    this.canvas.width = width;
    this.canvas.height = height;
    this.selectionCanvas.width = width;
    this.selectionCanvas.height = height;
    this.selectionCanvas.style.width = `${width}px`;
    this.selectionCanvas.style.height = `${height}px`;
    this.hoverCanvas.width = width;
    this.hoverCanvas.height = height;
    this.hoverCanvas.style.width = `${width}px`;
    this.hoverCanvas.style.height = `${height}px`;

    // Recalculate column widths and redraw
    this.calculateColumnWidths();
    await this.draw();
  }

  private calculateColumnWidths() {
    const availableWidth = this.canvas.width - this.options.rowHeaderWidth;
    const minTotalWidth = this.columns.length * this.options.minCellWidth;
    const hasScrollbar = minTotalWidth > availableWidth;

    // Calculate minimum widths based on content
    this.columnWidths = this.columns.map((col) => {
      const headerWidth = this.ctx.measureText(col.header).width + this.options.cellPadding * 2;
      return Math.max(headerWidth, this.options.minCellWidth);
    });

    // Calculate total width
    this.totalWidth = this.columnWidths.reduce((sum, width) => sum + width, 0) + this.options.rowHeaderWidth;

    // If we have extra space, distribute it proportionally
    if (this.totalWidth < availableWidth) {
      const extraWidth = availableWidth - this.totalWidth;
      const totalMinWidth = this.columnWidths.reduce((sum, width) => sum + width, 0);
      this.columnWidths = this.columnWidths.map((width) => width + (width / totalMinWidth) * extraWidth);
      this.totalWidth = availableWidth;
    }

    // Update visible columns
    this.visibleColumns = Math.ceil(availableWidth / (this.totalWidth / this.columns.length));
  }

  private async draw() {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    // Clear both canvases
    ctx.clearRect(0, 0, width, height);
    this.selectionCtx.clearRect(0, 0, width, height);
    this.hoverCtx.clearRect(0, 0, width, height);

    // Calculate visible area
    const visibleStartRow = Math.floor(this.scrollY / this.options.cellHeight);
    const visibleEndRow = Math.min(visibleStartRow + Math.ceil(height / this.options.cellHeight), await this.dataProvider.getTotalRows());
    const visibleStartCol = Math.floor(this.scrollX / (this.totalWidth / this.columns.length));
    const visibleEndCol = Math.min(visibleStartCol + this.visibleColumns, await this.dataProvider.getTotalColumns());

    // Draw cells
    await this.drawCells(visibleStartRow, visibleEndRow, visibleStartCol, visibleEndCol);

    // Draw scrollbars
    this.drawScrollbars();
  }

  private async handleMouseDown(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Check if clicking on scrollbars
    if (this.isOverVerticalScrollbar(x, y)) {
      this.mouseState = MouseState.DraggingVerticalScrollbar;
      this.dragStartY = y;
      this.lastScrollY = this.scrollY;
      return;
    }

    if (this.isOverHorizontalScrollbar(x, y)) {
      this.mouseState = MouseState.DraggingHorizontalScrollbar;
      this.dragStartX = x;
      this.lastScrollX = this.scrollX;
      return;
    }

    // Handle cell selection
    const cell = await this.getCellAtPosition(x, y);
    if (cell) {
      this.mouseState = MouseState.Dragging;
      this.selectedCells = {
        startRow: cell.row,
        endRow: cell.row,
        startCol: cell.col,
        endCol: cell.col,
      };
      // this.draw();
    }
  }

  private async handleMouseMove(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let needsRedraw = false;
    let newHoverCell: { row: number; col: number } | null = null;

    // Handle scrollbar dragging
    switch (this.mouseState) {
      case MouseState.DraggingVerticalScrollbar:
        const deltaY = y - this.dragStartY;
        const scrollRatioY = deltaY / (this.canvas.height - this.options.scrollbarWidth);
        this.scrollY = Math.max(0, this.lastScrollY + scrollRatioY * this.totalHeight);
        needsRedraw = true;
        break;

      case MouseState.DraggingHorizontalScrollbar:
        const deltaX = x - this.dragStartX;
        const scrollRatioX = deltaX / (this.canvas.width - this.options.scrollbarWidth);
        this.scrollX = Math.max(0, this.lastScrollX + scrollRatioX * this.totalWidth);
        needsRedraw = true;
        break;

      case MouseState.Dragging:
        // Update hover state
        newHoverCell = await this.getCellAtPosition(x, y);

        // Update selection if dragging
        if (newHoverCell && this.selectedCells) {
          const selectionChanged = newHoverCell.row !== this.selectedCells.endRow || newHoverCell.col !== this.selectedCells.endCol;

          if (selectionChanged) {
            this.selectedCells.endRow = newHoverCell.row;
            this.selectedCells.endCol = newHoverCell.col;
            // needsRedraw = true;
            this.drawSelection();
          }
        }
        break;

      case MouseState.Hovering:
        newHoverCell = await this.getCellAtPosition(x, y);
        const hoverChanged = newHoverCell?.row !== this.hoveredCell?.row || newHoverCell?.col !== this.hoveredCell?.col;
        if (hoverChanged) {
          this.hoveredCell = newHoverCell;
          // needsRedraw = true;
        }
        break;

      // case MouseState.HoveringVerticalScrollbar:
      //   newHoverCell = await this.getCellAtPosition(x, y);
      //   const hoverChanged = newHoverCell?.row !== this.hoveredCell?.row || newHoverCell?.col !== this.hoveredCell?.col;
      //   if (hoverChanged) {
      //     this.hoveredCell = newHoverCell;
      //     needsRedraw = true;
      //   }

      //   if (hoverChanged) {
      //     this.hoveredCell = newHoverCell;
      //     this.isHoveringVerticalScrollbar = this.isOverVerticalScrollbar(x, y);
      //     this.isHoveringHorizontalScrollbar = this.isOverHorizontalScrollbar(x, y);
      //     // needsRedraw = true;
      //     this.drawOverlay();
      //   }

      default:
        break;
    }

    if (needsRedraw) {
      await this.draw();
    }
  }

  private handleMouseUp() {
    // this.isDragging = false;
    // this.isDraggingVerticalScrollbar = false;
    // this.isDraggingHorizontalScrollbar = false;
    this.mouseState = MouseState.Idle;
  }

  private handleMouseLeave() {
    this.hoveredCell = null;
    // this.isHoveringVerticalScrollbar = false;
    // this.isHoveringHorizontalScrollbar = false;
    // this.isDragging = false;
    // this.isDraggingVerticalScrollbar = false;
    // this.isDraggingHorizontalScrollbar = false;
    this.mouseState = MouseState.Idle;
    this.draw();
  }

  private async handleWheel(event: WheelEvent) {
    event.preventDefault();

    if (event.ctrlKey) {
      // Zoom
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      this.options.fontSize = Math.max(8, Math.min(24, this.options.fontSize * zoomFactor));
      this.options.headerFontSize = Math.max(8, Math.min(24, this.options.headerFontSize * zoomFactor));
      this.calculateColumnWidths();
    } else {
      // Scroll
      this.scrollY = Math.max(0, this.scrollY + event.deltaY);
      this.scrollX = Math.max(0, this.scrollX + event.deltaX);
    }

    await this.draw();
  }

  private async handleKeyDown(event: KeyboardEvent) {
    if (!this.selectedCells) return;

    const { startRow, endRow, startCol, endCol } = this.selectedCells;
    const row = event.shiftKey ? endRow : startRow;
    const col = event.shiftKey ? endCol : startCol;

    switch (event.key) {
      case "ArrowUp":
        if (row > 0) {
          this.selectedCells = {
            startRow: event.shiftKey ? startRow : row - 1,
            endRow: event.shiftKey ? row - 1 : row - 1,
            startCol: event.shiftKey ? startCol : col,
            endCol: event.shiftKey ? endCol : col,
          };
          this.scrollY = Math.max(0, (row - 1) * this.options.cellHeight - this.canvas.height / 2);
        }
        break;

      case "ArrowDown":
        this.selectedCells = {
          startRow: event.shiftKey ? startRow : row + 1,
          endRow: event.shiftKey ? row + 1 : row + 1,
          startCol: event.shiftKey ? startCol : col,
          endCol: event.shiftKey ? endCol : col,
        };
        this.scrollY = Math.max(0, (row + 1) * this.options.cellHeight - this.canvas.height / 2);
        break;

      case "ArrowLeft":
        if (col > 0) {
          this.selectedCells = {
            startRow: event.shiftKey ? startRow : row,
            endRow: event.shiftKey ? endRow : row,
            startCol: event.shiftKey ? startCol : col - 1,
            endCol: event.shiftKey ? col - 1 : col - 1,
          };
          this.scrollX = Math.max(0, this.getColumnOffset(col - 1) - this.canvas.width / 2);
        }
        break;

      case "ArrowRight":
        if (col < this.columns.length - 1) {
          this.selectedCells = {
            startRow: event.shiftKey ? startRow : row,
            endRow: event.shiftKey ? endRow : row,
            startCol: event.shiftKey ? startCol : col + 1,
            endCol: event.shiftKey ? col + 1 : col + 1,
          };
          this.scrollX = Math.max(0, this.getColumnOffset(col + 1) - this.canvas.width / 2);
        }
        break;

      case "c":
        if (event.ctrlKey || event.metaKey) {
          this.copySelection();
        }
        break;
    }

    await this.draw();
  }

  private async handleResize() {
    this.updateCanvasSize();
    await this.draw();
  }

  private isOverVerticalScrollbar(x: number, y: number): boolean {
    return x >= this.canvas.width - this.options.scrollbarWidth;
  }

  private isOverHorizontalScrollbar(x: number, y: number): boolean {
    return y >= this.canvas.height - this.options.scrollbarWidth;
  }

  private getColumnOffset(col: number): number {
    return this.columnWidths.slice(0, col).reduce((sum, width) => sum + width, 0) + this.options.rowHeaderWidth;
  }

  private async copySelection() {
    if (!this.selectedCells) return;

    const { startRow, endRow, startCol, endCol } = this.selectedCells;
    const data = await this.dataProvider.fetchData(
      Math.min(startRow, endRow),
      Math.max(startRow, endRow) + 1,
      Math.min(startCol, endCol),
      Math.max(startCol, endCol) + 1
    );

    const text = data.map((row) => row.map((cell) => this.formatCellValue(cell)).join("\t")).join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error("Failed to copy to clipboard:", err);
    }
  }

  private formatCellValue(value: any): string {
    if (value === null || value === undefined) return "NA";
    if (typeof value === "string") return value;
    if (typeof value === "number") return value.toLocaleString(undefined, this.options.numberFormat);
    if (value instanceof Date) {
      const format = value.getHours() === 0 && value.getMinutes() === 0 ? this.options.dateFormat : this.options.datetimeFormat;
      return format.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => {
        switch (match) {
          case "yyyy":
            return value.getFullYear().toString();
          case "MM":
            return (value.getMonth() + 1).toString().padStart(2, "0");
          case "dd":
            return value.getDate().toString().padStart(2, "0");
          case "HH":
            return value.getHours().toString().padStart(2, "0");
          case "mm":
            return value.getMinutes().toString().padStart(2, "0");
          case "ss":
            return value.getSeconds().toString().padStart(2, "0");
          default:
            return match;
        }
      });
    }
    return String(value);
  }

  private async getCellAtPosition(x: number, y: number): Promise<{ row: number; col: number } | null> {
    const adjustedX = x + this.scrollX;
    const adjustedY = y + this.scrollY;

    // Check if we're in the row header area
    if (adjustedX < this.options.rowHeaderWidth) {
      const row = Math.floor(adjustedY / this.options.cellHeight);
      const totalRows = await this.dataProvider.getTotalRows();
      if (row >= 0 && row < totalRows) {
        return { row, col: -1 };
      }
      return null;
    }

    // Find the column
    let colOffset = this.options.rowHeaderWidth;
    let col = 0;
    for (; col < this.columnWidths.length; col++) {
      if (adjustedX < colOffset + this.columnWidths[col]) break;
      colOffset += this.columnWidths[col];
    }

    // Find the row
    const row = Math.floor(adjustedY / this.options.cellHeight);
    const totalRows = await this.dataProvider.getTotalRows();
    const totalColumns = await this.dataProvider.getTotalColumns();

    // Check bounds
    if (row >= 0 && row < totalRows && col < totalColumns) {
      return { row, col };
    }

    return null;
  }

  private async drawCells(startRow: number, endRow: number, startCol: number, endCol: number) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    // Draw headers
    ctx.fillStyle = this.options.headerBackgroundColor;
    ctx.fillRect(0, 0, width, this.options.cellHeight);
    ctx.fillRect(0, 0, this.options.rowHeaderWidth, height);

    // Draw column headers
    ctx.font = `${this.options.headerFontSize}px ${this.options.fontFamily}`;
    ctx.fillStyle = this.options.headerTextColor;
    ctx.textBaseline = "middle";

    let x = this.options.rowHeaderWidth - this.scrollX;
    for (let col = startCol; col < endCol; col++) {
      const textWidth = ctx.measureText(this.columns[col].header).width;
      const textX = x + (this.columnWidths[col] - textWidth) / 2;
      const textY = this.options.cellHeight / 2;

      if (x + this.columnWidths[col] > 0 && x < width) {
        ctx.fillText(this.columns[col].header, textX, textY);
      }
      x += this.columnWidths[col];
    }

    // Draw row headers
    ctx.textAlign = "right";
    let y = this.options.cellHeight - this.scrollY;
    for (let row = startRow; row < endRow; row++) {
      if (y + this.options.cellHeight > 0 && y < height) {
        const text = (row + 1).toString();
        const textX = this.options.rowHeaderWidth - this.options.cellPadding;
        const textY = y + this.options.cellHeight / 2;
        ctx.fillText(text, textX, textY);
      }
      y += this.options.cellHeight;
    }

    // Draw cells
    const data = await this.dataProvider.fetchData(startRow, endRow, startCol, endCol);
    ctx.textAlign = "left";
    ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
    ctx.fillStyle = this.options.cellTextColor;

    y = this.options.cellHeight - this.scrollY;
    for (let row = 0; row < data.length; row++) {
      x = this.options.rowHeaderWidth - this.scrollX;
      for (let col = 0; col < data[row].length; col++) {
        const cellWidth = this.columnWidths[col + startCol];
        const column = this.columns[col + startCol];

        if (x + cellWidth > 0 && x < width && y + this.options.cellHeight > 0 && y < height) {
          // Draw cell background
          ctx.fillStyle = this.options.cellBackgroundColor;
          ctx.fillRect(x, y, cellWidth, this.options.cellHeight);

          // Draw cell text
          ctx.fillStyle = this.options.cellTextColor;
          const text = this.formatCellValue(data[row][col]);
          // const textWidth = ctx.measureText(text).width;
          const textX = x + this.options.cellPadding;
          const textY = y + this.options.cellHeight / 2;

          // Align text based on data type
          if (column.dataType === "number" || column.dataType === "date" || column.dataType === "datetime") {
            ctx.textAlign = "right";
            ctx.fillText(text, x + cellWidth - this.options.cellPadding, textY);
          } else {
            ctx.textAlign = "left";
            ctx.fillText(text, textX, textY);
          }

          // Draw cell border
          ctx.strokeStyle = this.options.borderColor;
          ctx.strokeRect(x, y, cellWidth, this.options.cellHeight);
        }

        x += cellWidth;
      }
      y += this.options.cellHeight;
    }
  }

  private drawSelection() {
    // Clear only the overlay canvas
    this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);

    // Draw selection
    if (this.selectedCells) {
      const { startRow, endRow, startCol, endCol } = this.selectedCells;
      this.selectionCtx.fillStyle = this.options.selectionColor;

      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const x = this.getColumnOffset(col) - this.scrollX;
          const y = row * this.options.cellHeight - this.scrollY;
          const width = this.columnWidths[col];
          const height = this.options.cellHeight;

          if (x + width > 0 && x < this.canvas.width && y + height > 0 && y < this.canvas.height) {
            this.selectionCtx.fillRect(x, y, width, height);
          }
        }
      }
    }

    // Draw hover
    if (this.hoveredCell) {
      const { row, col } = this.hoveredCell;
      this.hoverCtx.fillStyle = this.options.hoverColor;

      const x = col === -1 ? 0 : this.getColumnOffset(col) - this.scrollX;
      const y = row * this.options.cellHeight - this.scrollY;
      const width = col === -1 ? this.options.rowHeaderWidth : this.columnWidths[col];
      const height = this.options.cellHeight;

      if (x + width > 0 && x < this.canvas.width && y + height > 0 && y < this.canvas.height) {
        this.selectionCtx.fillRect(x, y, width, height);
      }
    }
  }

  private drawScrollbars() {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    // Draw vertical scrollbar
    if (this.totalHeight > height) {
      const scrollbarHeight = (height / this.totalHeight) * height;
      const scrollbarY = (this.scrollY / this.totalHeight) * height;
      const scrollbarX = width - this.options.scrollbarWidth;

      // Draw track
      ctx.fillStyle = this.options.scrollbarColor;
      ctx.fillRect(scrollbarX, 0, this.options.scrollbarWidth, height);

      // Draw thumb
      ctx.fillStyle =
        this.mouseState === MouseState.HoveringVerticalScrollbar || this.mouseState === MouseState.DraggingVerticalScrollbar
          ? this.options.scrollbarHoverColor
          : this.options.scrollbarThumbColor;
      ctx.fillRect(scrollbarX, scrollbarY, this.options.scrollbarWidth, scrollbarHeight);
    }

    // Draw horizontal scrollbar
    if (this.totalWidth > width) {
      const scrollbarWidth = (width / this.totalWidth) * width;
      const scrollbarX = (this.scrollX / this.totalWidth) * width;
      const scrollbarY = height - this.options.scrollbarWidth;

      // Draw track
      ctx.fillStyle = this.options.scrollbarColor;
      ctx.fillRect(0, scrollbarY, width, this.options.scrollbarWidth);

      // Draw thumb
      ctx.fillStyle =
        this.mouseState === MouseState.HoveringHorizontalScrollbar || this.mouseState === MouseState.DraggingHorizontalScrollbar
          ? this.options.scrollbarHoverColor
          : this.options.scrollbarThumbColor;
      ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, this.options.scrollbarWidth);
    }
  }
}
