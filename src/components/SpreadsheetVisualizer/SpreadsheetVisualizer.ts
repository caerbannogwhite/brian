import {
  DEFAULT_MAX_WIDTH,
  DEFAULT_MIN_HEIGHT,
  DEFAULT_MAX_HEIGHT,
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
  DEFAULT_BOOLEAN_STYLE,
  DEFAULT_NUMERIC_STYLE,
  DEFAULT_STRING_STYLE,
  DEFAULT_DATE_STYLE,
  DEFAULT_DATETIME_STYLE,
  DEFAULT_NULL_STYLE,
  getDefaultHeaderBackgroundColor,
  getDefaultHeaderTextColor,
  getDefaultCellBackgroundColor,
  getDefaultCellTextColor,
  getDefaultBorderColor,
  getDefaultSelectionColor,
  getDefaultHoverColor,
  getDefaultScrollbarColor,
  getDefaultScrollbarThumbColor,
  getDefaultScrollbarHoverColor,
  getDefaultBooleanStyle,
  getDefaultNumericStyle,
  getDefaultStringStyle,
  getDefaultDateStyle,
  getDefaultDatetimeStyle,
  getDefaultNullStyle,
} from "./defaults";
import { listenForThemeChanges } from "./utils/theme";
import { Column, SpreadsheetOptions, DataProvider } from "./types";
import { minMax } from "./utils/drawing";
import { throttle } from "./utils/throttle";
import { ColumnStatsVisualizer } from "../ColumnStatsVisualizer/ColumnStatsVisualizer";
import { ContextMenu } from "./ContextMenu";

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

enum ToDraw {
  None = 0,
  CellHover = 1,
  RowHover = 2,
  ColHover = 3,
  Selection = 4,
  Cells = 5,
}

export class SpreadsheetVisualizer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private selectionCanvas: HTMLCanvasElement;
  private hoverCanvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private selectionCtx: CanvasRenderingContext2D;
  private hoverCtx: CanvasRenderingContext2D;
  private dataProvider: DataProvider;
  private columns: Column[];
  private totalRows: number;
  private totalCols: number;
  private options: RequiredSpreadsheetOptions;
  private throttledMouseMove: (event: MouseEvent) => void;

  // State variables
  private scrollX = 0;
  private scrollY = 0;
  private hoveredCell: { row: number; col: number } | null = null;
  private selectedCells: { startRow: number; endRow: number; startCol: number; endCol: number } | null = null;
  private mouseState = MouseState.Idle;
  private toDraw = ToDraw.Cells;
  private dragStartX = 0;
  private dragStartY = 0;
  private lastScrollX = 0;
  private lastScrollY = 0;
  private singleColSelectionMode: boolean = true;
  private selectedRows: number[] = [];
  private selectedCols: number[] = [];

  // Cache
  private colWidths: number[] = [];
  private colOffsets: number[] = [];
  private totalWidth = 0;
  private totalHeight = 0;
  private totalScrollY = 0;
  private totalScrollX = 0;
  // private dataCache: Map<string, any[][]> = new Map();

  // Stats panel
  private statsPanelWidth = 350; // Width of the stats panel
  private hasStatsPanel = false;
  private statsVisualizer: ColumnStatsVisualizer | null;

  // Context menu for export options
  private contextMenu: ContextMenu;

  // Theme management
  private themeCleanup: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    dataProvider: DataProvider,
    options: Partial<SpreadsheetOptions> = {},
    statsVisualizer?: ColumnStatsVisualizer
  ) {
    this.container = container;

    this.canvas = document.createElement("canvas");
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext("2d")!;

    // Create and setup an overlay canvas for selection
    this.selectionCanvas = document.createElement("canvas");
    this.selectionCanvas.id = "selection-canvas";
    this.selectionCanvas.style.position = "absolute";
    this.selectionCanvas.style.top = `${this.canvas.offsetTop}px`;
    this.selectionCanvas.style.left = `${this.canvas.offsetLeft}px`;
    this.selectionCanvas.style.pointerEvents = "none"; // Allow mouse events to pass through to main canvas
    this.selectionCtx = this.selectionCanvas.getContext("2d", { alpha: true })!;

    // Insert selection canvas after the main canvas
    this.container.insertBefore(this.selectionCanvas, this.canvas.nextSibling);

    // Create and setup an overlay canvas for hover
    this.hoverCanvas = document.createElement("canvas");
    this.hoverCanvas.id = "hover-canvas";
    this.hoverCanvas.style.position = "absolute";
    this.hoverCanvas.style.top = `${this.canvas.offsetTop}px`;
    this.hoverCanvas.style.left = `${this.canvas.offsetLeft}px`;
    this.hoverCanvas.style.pointerEvents = "none"; // Allow mouse events to pass through to main canvas
    this.hoverCtx = this.hoverCanvas.getContext("2d", { alpha: true })!;

    // Insert hover canvas after the main canvas
    this.container.insertBefore(this.hoverCanvas, this.canvas.nextSibling);

    // Initialize data provider
    this.dataProvider = dataProvider;

    this.columns = [];
    this.totalRows = 0;
    this.totalCols = 0;

    // Set default options
    this.options = {
      // Viewport options
      maxHeight: options.maxHeight ?? DEFAULT_MAX_HEIGHT,
      maxWidth: options.maxWidth ?? DEFAULT_MAX_WIDTH,
      minHeight: options.minHeight ?? DEFAULT_MIN_HEIGHT,
      minWidth: options.minWidth ?? DEFAULT_MIN_WIDTH,
      height: options.height ?? this.container.clientHeight,
      width: options.width ?? this.container.clientWidth,

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
      booleanStyle: options.booleanStyle ?? DEFAULT_BOOLEAN_STYLE,
      numericStyle: options.numericStyle ?? DEFAULT_NUMERIC_STYLE,
      stringStyle: options.stringStyle ?? DEFAULT_STRING_STYLE,
      dateStyle: options.dateStyle ?? DEFAULT_DATE_STYLE,
      datetimeStyle: options.datetimeStyle ?? DEFAULT_DATETIME_STYLE,
      nullStyle: options.nullStyle ?? DEFAULT_NULL_STYLE,

      dateFormat: options.dateFormat ?? DEFAULT_DATE_FORMAT,
      datetimeFormat: options.datetimeFormat ?? DEFAULT_DATETIME_FORMAT,
      numberFormat: options.numberFormat ?? DEFAULT_NUMBER_FORMAT,
    };

    // Apply constraints
    this.options.height = minMax(this.options.height, this.options.minHeight, this.options.maxHeight);
    this.options.width = minMax(this.options.width, this.options.minWidth, this.options.maxWidth);

    // Initialize throttled mouse move handler (16ms = ~60fps)
    this.throttledMouseMove = throttle(this.handleMouseMove.bind(this), 16);

    // Use provided stats visualizer or create a new one
    if (statsVisualizer) {
      this.statsVisualizer = statsVisualizer;
      // Update the data provider for the shared stats visualizer (no columns selected initially)
      // Note: Not awaiting since we're in constructor and no columns are selected yet
      this.statsVisualizer.setDataProvider(dataProvider, []).catch(console.error);
    } else {
      this.statsVisualizer = new ColumnStatsVisualizer(this.container, dataProvider, this.statsPanelWidth);
    }

    // Create context menu for export options
    this.contextMenu = new ContextMenu(dataProvider, this.options, () => this.selectedCells);

    // Setup theme change listener
    this.themeCleanup = listenForThemeChanges(() => {
      this.updateThemeColors();
      // Redraw to apply new colors
      this.updateToDraw(ToDraw.Cells);
      this.draw().catch(console.error);
    });
  }

  private updateThemeColors(): void {
    // Update colors based on current theme
    this.options.headerBackgroundColor = getDefaultHeaderBackgroundColor();
    this.options.headerTextColor = getDefaultHeaderTextColor();
    this.options.cellBackgroundColor = getDefaultCellBackgroundColor();
    this.options.cellTextColor = getDefaultCellTextColor();
    this.options.borderColor = getDefaultBorderColor();
    this.options.selectionColor = getDefaultSelectionColor();
    this.options.hoverColor = getDefaultHoverColor();
    this.options.scrollbarColor = getDefaultScrollbarColor();
    this.options.scrollbarThumbColor = getDefaultScrollbarThumbColor();
    this.options.scrollbarHoverColor = getDefaultScrollbarHoverColor();
    this.options.booleanStyle = getDefaultBooleanStyle();
    this.options.numericStyle = getDefaultNumericStyle();
    this.options.stringStyle = getDefaultStringStyle();
    this.options.dateStyle = getDefaultDateStyle();
    this.options.datetimeStyle = getDefaultDatetimeStyle();
    this.options.nullStyle = getDefaultNullStyle();
  }

  public async initialize() {
    const metadata = await this.dataProvider.getMetadata();
    this.columns = metadata.columns;
    this.totalRows = metadata.totalRows;
    this.totalCols = metadata.totalColumns;

    this.setupEventListeners();
    await this.updateLayout();
  }

  public show(): void {
    this.container.style.display = "block";
  }

  public hide(): void {
    this.container.style.display = "none";
    this.statsVisualizer?.hide();
  }

  public getSelectedColumns(): Column[] {
    return this.selectedCols.map((colIndex) => this.columns[colIndex]).filter((col) => col !== undefined);
  }

  public destroy(): void {
    // Clean up theme listener
    if (this.themeCleanup) {
      this.themeCleanup();
      this.themeCleanup = null;
    }

    // Hide context menu
    this.contextMenu.hide();

    // Hide stats visualizer if we own it
    if (this.statsVisualizer && !this.hasStatsPanel) {
      this.statsVisualizer.hide();
    }
  }

  private setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener("mousedown", (event) => this.handleMouseDown(event).catch(console.error));
    this.canvas.addEventListener("mousemove", this.throttledMouseMove);
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("mouseleave", this.handleMouseLeave.bind(this));
    this.canvas.addEventListener("wheel", (event) => this.handleWheel(event).catch(console.error));
    this.canvas.addEventListener("contextmenu", (event) => this.contextMenu.show(event).catch(console.error));

    // Keyboard events
    window.addEventListener("keydown", (event) => this.handleKeyDown(event).catch(console.error));

    // Window events
    window.addEventListener("resize", () => this.handleResize().catch(console.error));

    // Hide context menu when clicking outside
    document.addEventListener("click", () => this.contextMenu.hide());
  }

  private async updateLayout() {
    // Always use container dimensions for responsive behavior, but respect min/max constraints
    let width = Math.floor(minMax(this.container.clientWidth, this.options.minWidth, this.options.maxWidth));
    let height = Math.floor(minMax(this.container.clientHeight, this.options.minHeight, this.options.maxHeight));

    // Fallback to options dimensions if container has no size (e.g., during initialization)
    if (width <= 0 && this.options.width !== undefined) {
      width = Math.floor(minMax(this.options.width, this.options.minWidth, this.options.maxWidth));
    }
    if (height <= 0 && this.options.height !== undefined) {
      height = Math.floor(minMax(this.options.height, this.options.minHeight, this.options.maxHeight));
    }

    // Ensure we have valid dimensions
    if (width <= 0) width = this.options.minWidth;
    if (height <= 0) height = this.options.minHeight;

    if (this.hasStatsPanel) {
      // Adjust canvas width to make room for stats panel
      width = Math.floor(Math.max(width - this.statsPanelWidth, this.options.minWidth));

      // Show stats panel
      const statsContainer = document.getElementById("column-stats-container");
      if (statsContainer) {
        statsContainer.style.transform = "translateX(0)";
      }
    } else {
      // Hide stats panel
      const statsContainer = document.getElementById("column-stats-container");
      if (statsContainer) {
        statsContainer.style.transform = "translateX(100%)";
      }
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.selectionCanvas.width = width;
    this.selectionCanvas.height = height;
    this.selectionCanvas.style.width = `${width}px`;
    this.selectionCanvas.style.height = `${height}px`;
    this.selectionCanvas.style.top = `${this.canvas.offsetTop}px`;
    this.selectionCanvas.style.left = `${this.canvas.offsetLeft}px`;

    this.hoverCanvas.width = width;
    this.hoverCanvas.height = height;
    this.hoverCanvas.style.width = `${width}px`;
    this.hoverCanvas.style.height = `${height}px`;
    this.hoverCanvas.style.top = `${this.canvas.offsetTop}px`;
    this.hoverCanvas.style.left = `${this.canvas.offsetLeft}px`;

    // Recalculate column widths and redraw
    this.calculateColumnWidths();
    this.calculateRowHeight();

    this.updateToDraw(ToDraw.Cells);

    await this.draw();
  }

  private calculateColumnWidths() {
    const availableWidth = this.canvas.width - this.options.rowHeaderWidth;

    // Calculate minimum widths based on content
    this.colWidths = this.columns.map((col) => {
      const headerWidth = this.ctx.measureText(col.name).width + this.options.cellPadding * 2;
      return Math.max(headerWidth, this.options.minCellWidth);
    });

    // Calculate column offsets
    this.colOffsets = [this.options.rowHeaderWidth];
    for (let i = 1; i < this.columns.length; i++) {
      this.colOffsets.push(this.colOffsets[i - 1] + this.colWidths[i - 1]);
    }

    // Calculate total width
    this.totalWidth = this.colOffsets[this.colOffsets.length - 1] + this.colWidths[this.colWidths.length - 1];

    const hasScrollbar = this.totalWidth > availableWidth;

    // TODO: check if this is needed
    // // If we have extra space, distribute it proportionally
    // if (this.totalWidth < availableWidth) {
    //   const extraWidth = availableWidth - this.totalWidth;
    //   this.colWidths = this.colWidths.map((width) => width + (width / this.totalWidth) * extraWidth);
    //   this.totalWidth = availableWidth;
    // }

    this.totalScrollX = this.totalWidth - this.canvas.width + (hasScrollbar ? this.options.scrollbarWidth : 0);
  }

  private calculateRowHeight() {
    const availableHeight = this.canvas.height - this.options.scrollbarWidth;
    const minTotalHeight = this.columns.length * this.options.cellHeight;
    const hasScrollbar = minTotalHeight > availableHeight;

    this.totalHeight = this.totalRows * this.options.cellHeight;
    this.totalScrollY =
      this.totalHeight -
      this.canvas.height +
      this.options.cellHeight * 2 + // header
      (hasScrollbar ? this.options.scrollbarWidth : 0);
  }

  private updateToDraw(newToDraw: ToDraw) {
    this.toDraw = Math.max(this.toDraw, newToDraw);
  }

  private async draw() {
    const { canvas } = this;
    const { height } = canvas;

    // Calculate visible area
    const visibleStartRow = Math.floor(this.scrollY / this.options.cellHeight);
    const visibleEndRow = Math.min(visibleStartRow + Math.ceil(height / this.options.cellHeight), this.totalRows);

    switch (this.toDraw) {
      //@ts-ignore: if cells is selected, fall through to selection
      case ToDraw.Cells:
        await this.drawCells(visibleStartRow, visibleEndRow);
        this.drawScrollbars();

      //@ts-ignore: if cells is selected, fall through to hover
      case ToDraw.Selection:
        this.drawSelection(visibleStartRow);

      case ToDraw.CellHover:
        this.drawCellHover(visibleStartRow);
        break;

      // case ToDraw.RowHover:
      //   this.drawRowHover(visibleStartRow, visibleEndRow);
      //   break;

      case ToDraw.ColHover:
        this.drawColHover();
        break;

      default:
        break;
    }

    this.toDraw = ToDraw.None;
  }

  private async handleMouseDown(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Vertical Scrolling
    if (this.isMouseOverVerticalScrollbar(x, y)) {
      this.mouseState = MouseState.DraggingVerticalScrollbar;
      this.dragStartY = y;
      this.lastScrollY = this.scrollY;

      return;
    }

    // Horizontal Scrolling
    else if (this.isMouseOverHorizontalScrollbar(x, y)) {
      this.mouseState = MouseState.DraggingHorizontalScrollbar;
      this.dragStartX = x;
      this.lastScrollX = this.scrollX;

      return;
    }

    // Column Header
    if (this.isMouseOverColumnHeader(x, y)) {
      const cell = this.getCellAtPosition(x, y);
      if (!cell) return;
      const { col } = cell;

      let hasStatusPanelChanged = false;
      if (this.selectedCols.includes(col)) {
        this.selectedCols = this.selectedCols.filter((i) => i !== col);
        this.statsVisualizer?.hide();
        this.hasStatsPanel = false;
        hasStatusPanelChanged = true;
      } else {
        hasStatusPanelChanged = !this.hasStatsPanel;
        if (this.singleColSelectionMode) {
          this.selectedCols = [col]; // Only allow one column selection at a time
        } else {
          this.selectedCols.push(col);
        }

        if (this.statsVisualizer) {
          await this.statsVisualizer.showStats(this.columns[col]);
          this.hasStatsPanel = true;
        }
      }

      this.updateToDraw(ToDraw.Selection);
      if (hasStatusPanelChanged) {
        this.updateLayout();
      }
    }

    // Row Index
    else if (this.isMouseOverRowIndex(x, y)) {
      const cell = this.getCellAtPosition(x, y);
      if (!cell) return;
      const { row } = cell;

      if (this.selectedRows.includes(row)) {
        this.selectedRows = this.selectedRows.filter((i) => i !== row);
      } else {
        this.selectedRows.push(row);
      }

      this.updateToDraw(ToDraw.Selection);
    }

    // Handle cell selection
    else {
      // Right click is handled by the context menu
      if (event.button === 2) {
        return;
      }

      const cell = this.getCellAtPosition(x, y);
      if (cell) {
        this.mouseState = MouseState.Dragging;
        this.selectedCells = {
          startRow: cell.row,
          endRow: cell.row,
          startCol: cell.col,
          endCol: cell.col,
        };

        this.updateToDraw(ToDraw.Selection);
      }
    }

    await this.draw();
  }

  private async handleMouseMove(event: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    let newHoverCell: { row: number; col: number } | null = null;

    switch (this.mouseState) {
      case MouseState.DraggingVerticalScrollbar:
        const deltaY = y - this.dragStartY;
        const scrollRatioY = deltaY / (this.canvas.height - this.options.scrollbarWidth);
        this.scrollY = minMax(this.lastScrollY + scrollRatioY * this.totalScrollY, 0, this.totalScrollY);
        this.updateToDraw(ToDraw.Cells);
        break;

      case MouseState.DraggingHorizontalScrollbar:
        const deltaX = x - this.dragStartX;
        const scrollRatioX = deltaX / (this.canvas.width - this.options.scrollbarWidth);
        this.scrollX = minMax(this.lastScrollX + scrollRatioX * this.totalScrollX, 0, this.totalScrollX);
        this.updateToDraw(ToDraw.Cells);
        break;

      case MouseState.Dragging:
        newHoverCell = this.getCellAtPosition(x, y);

        // Update selection if dragging
        if (newHoverCell && this.selectedCells) {
          const selectionChanged = newHoverCell.row !== this.selectedCells.endRow || newHoverCell.col !== this.selectedCells.endCol;

          if (selectionChanged) {
            this.selectedCells.endRow = newHoverCell.row;
            this.selectedCells.endCol = newHoverCell.col;

            this.updateToDraw(ToDraw.Selection);
          }
        }
        break;

      // Hovering
      default:
        newHoverCell = this.getCellAtPosition(x, y);
        const hoverChanged = newHoverCell?.row !== this.hoveredCell?.row || newHoverCell?.col !== this.hoveredCell?.col;
        if (hoverChanged) {
          this.hoveredCell = newHoverCell;
          if (this.isMouseOverColumnHeader(x, y)) {
            this.updateToDraw(ToDraw.ColHover);
          } else if (this.isMouseOverRowIndex(x, y)) {
            this.updateToDraw(ToDraw.RowHover);
          } else {
            this.updateToDraw(ToDraw.CellHover);
          }
        }
        break;
    }

    await this.draw();
  }

  private handleMouseUp() {
    this.mouseState = MouseState.Idle;
  }

  private async handleMouseLeave() {
    this.hoveredCell = null;
    this.mouseState = MouseState.Idle;
    this.updateToDraw(ToDraw.CellHover);

    await this.draw();
  }

  private async handleWheel(event: WheelEvent) {
    event.preventDefault();

    // Zoom
    if (event.ctrlKey) {
      // TODO: implement zoom
      // const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      // this.options.fontSize = Math.max(8, Math.min(24, this.options.fontSize * zoomFactor));
      // this.options.headerFontSize = Math.max(8, Math.min(24, this.options.headerFontSize * zoomFactor));
      // this.calculateColumnWidths();
      // this.updateToDraw(ToDraw.Cells);
    }

    // Scroll
    else {
      const prevScrollY = this.scrollY;
      const prevScrollX = this.scrollX;

      this.scrollY = minMax(this.scrollY + event.deltaY, 0, this.totalScrollY);
      this.scrollX = minMax(this.scrollX + event.deltaX, 0, this.totalScrollX);

      if (prevScrollY !== this.scrollY || prevScrollX !== this.scrollX) {
        this.updateToDraw(ToDraw.Cells);
      }
    }

    await this.draw();
  }

  private async handleKeyDown(event: KeyboardEvent) {
    if (!this.selectedCells) return;

    const { startRow, endRow, startCol, endCol } = this.selectedCells;
    const row = event.shiftKey ? endRow : startRow;
    const col = event.shiftKey ? endCol : startCol;

    const prevScrollY = this.scrollY;
    const prevScrollX = this.scrollX;

    switch (event.key) {
      case "ArrowUp":
        this.selectedCells = {
          startRow: event.shiftKey ? startRow : row - 1,
          endRow: event.shiftKey ? row - 1 : row - 1,
          startCol: event.shiftKey ? startCol : col,
          endCol: event.shiftKey ? endCol : col,
        };

        this.selectedCells.startRow = Math.max(1, this.selectedCells.startRow);
        this.selectedCells.endRow = Math.max(1, this.selectedCells.endRow);

        this.scrollY = minMax((row - 1) * this.options.cellHeight - this.canvas.height / 2, 0, this.totalScrollY);
        if (prevScrollY !== this.scrollY) {
          this.updateToDraw(ToDraw.Cells);
        } else {
          this.updateToDraw(ToDraw.Selection);
        }
        break;

      case "ArrowDown":
        this.selectedCells = {
          startRow: event.shiftKey ? startRow : row + 1,
          endRow: event.shiftKey ? row + 1 : row + 1,
          startCol: event.shiftKey ? startCol : col,
          endCol: event.shiftKey ? endCol : col,
        };

        this.selectedCells.startRow = Math.min(this.totalRows, this.selectedCells.startRow);
        this.selectedCells.endRow = Math.min(this.totalRows, this.selectedCells.endRow);

        this.scrollY = minMax((row + 1) * this.options.cellHeight - this.canvas.height / 2, 0, this.totalScrollY);
        if (prevScrollY !== this.scrollY) {
          this.updateToDraw(ToDraw.Cells);
        } else {
          this.updateToDraw(ToDraw.Selection);
        }
        break;

      case "ArrowLeft":
        this.selectedCells = {
          startRow: event.shiftKey ? startRow : row,
          endRow: event.shiftKey ? endRow : row,
          startCol: event.shiftKey ? startCol : col - 1,
          endCol: event.shiftKey ? col - 1 : col - 1,
        };

        this.selectedCells.startCol = Math.max(0, this.selectedCells.startCol);
        this.selectedCells.endCol = Math.max(0, this.selectedCells.endCol);

        this.scrollX = minMax(this.colOffsets[col] - this.canvas.width / 2, 0, this.totalScrollX);
        if (prevScrollX !== this.scrollX) {
          this.updateToDraw(ToDraw.Cells);
        } else {
          this.updateToDraw(ToDraw.Selection);
        }
        break;

      case "ArrowRight":
        this.selectedCells = {
          startRow: event.shiftKey ? startRow : row,
          endRow: event.shiftKey ? endRow : row,
          startCol: event.shiftKey ? startCol : col + 1,
          endCol: event.shiftKey ? col + 1 : col + 1,
        };

        this.selectedCells.startCol = Math.min(this.totalCols - 1, this.selectedCells.startCol);
        this.selectedCells.endCol = Math.min(this.totalCols - 1, this.selectedCells.endCol);

        this.scrollX = minMax(this.colOffsets[col] - this.canvas.width / 2, 0, this.totalScrollX);
        if (prevScrollX !== this.scrollX) {
          this.updateToDraw(ToDraw.Cells);
        } else {
          this.updateToDraw(ToDraw.Selection);
        }
        break;

      case "c":
        if (event.ctrlKey || event.metaKey) {
          this.contextMenu.exportAsCSV();
        }
        break;
    }

    await this.draw();
  }

  private async handleResize() {
    await this.updateLayout();
    this.updateToDraw(ToDraw.Cells);
    await this.draw();
  }

  public async resize(): Promise<void> {
    // Public method to trigger resize from external components
    await this.handleResize();
  }

  private isMouseOverVerticalScrollbar(x: number, _: number): boolean {
    return x >= this.canvas.width - this.options.scrollbarWidth;
  }

  private isMouseOverHorizontalScrollbar(_: number, y: number): boolean {
    return y >= this.canvas.height - this.options.scrollbarWidth;
  }

  private isMouseOverColumnHeader(x: number, y: number): boolean {
    return x >= this.options.rowHeaderWidth && y < this.options.cellHeight;
  }

  private isMouseOverRowIndex(x: number, _: number): boolean {
    return x <= this.options.rowHeaderWidth;
  }

  private getFirstVisibleCol(): number {
    for (let i = 0; i < this.columns.length; i++) {
      if (this.colOffsets[i] >= this.scrollX) {
        return i == 0 ? 0 : i - 1;
      }
    }

    return 0;
  }

  private getLastVisibleCol(): number {
    const firstVisibleCol = this.getFirstVisibleCol();

    for (let i = firstVisibleCol; i < this.columns.length; i++) {
      if (this.colOffsets[i] + this.colWidths[i] > this.scrollX + this.canvas.width) {
        return i;
      }
    }

    return this.columns.length - 1;
  }

  private getCellAtPosition(x: number, y: number): { row: number; col: number } | null {
    const adjustedX = x + this.scrollX;
    const adjustedY = y + this.scrollY;

    // Check if we're in the row header area
    if (adjustedX < this.options.rowHeaderWidth) {
      const row = Math.floor(adjustedY / this.options.cellHeight);
      if (row >= 0 && row < this.totalRows) {
        return { row, col: -1 };
      }
      return null;
    }

    // Find the column
    let colOffset = this.options.rowHeaderWidth;
    let col = 0;
    for (; col < this.colWidths.length; col++) {
      if (adjustedX < colOffset + this.colWidths[col]) break;
      colOffset += this.colWidths[col];
    }

    // Find the row
    const row = Math.floor(adjustedY / this.options.cellHeight);

    // Check bounds
    if (row >= 0 && row < this.totalRows && col < this.totalCols) {
      return { row, col };
    }

    return null;
  }

  private async drawCells(startRow: number, endRow: number) {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    const firstVisibleCol = this.getFirstVisibleCol();
    const lastVisibleCol = this.getLastVisibleCol();

    // Get the data before clearing the canvas
    const data = await this.dataProvider.fetchData(startRow, endRow, firstVisibleCol, lastVisibleCol);

    // Clear the canvas
    ctx.clearRect(0, 0, width, height);

    // Draw headers
    ctx.fillStyle = this.options.headerBackgroundColor;
    ctx.fillRect(0, 0, width, this.options.cellHeight);
    ctx.fillRect(0, 0, this.options.rowHeaderWidth, height);

    // Common settings for text
    ctx.font = `${this.options.headerFontSize}px ${this.options.fontFamily}`;
    ctx.fillStyle = this.options.headerTextColor;
    ctx.textBaseline = "middle";

    // Draw column headers
    ctx.textAlign = "left";
    ctx.strokeStyle = this.options.borderColor;

    let x = this.colOffsets[firstVisibleCol] - this.scrollX;
    for (let col = firstVisibleCol; col <= lastVisibleCol; col++) {
      ctx.strokeRect(x, 0, this.colWidths[col], this.options.cellHeight);

      const textWidth = ctx.measureText(this.columns[col].name).width;
      const availableWidth = this.colWidths[col] - this.options.cellPadding * 2;
      const availableTextLength = Math.floor((availableWidth / textWidth) * this.columns[col].name.length);
      const text = this.columns[col].name.slice(0, availableTextLength);

      const textX = x + this.options.cellPadding;
      const textY = this.options.cellHeight >> 1; // Divide by 2 to center the text

      ctx.strokeText(text, textX, textY, availableWidth);
      ctx.fillText(text, textX, textY, availableWidth);

      x += this.colWidths[col];
    }

    // Draw cells
    let y = this.options.cellHeight; // Keep the header at the top
    for (let row = 0; row < data.length; row++) {
      x = this.colOffsets[firstVisibleCol] - this.scrollX;
      for (let col = 0; col < data[row].length; col++) {
        const cellWidth = this.colWidths[col + firstVisibleCol];
        const column = this.columns[col + firstVisibleCol];

        // Draw cell background
        ctx.fillStyle = this.options.cellBackgroundColor;
        ctx.fillRect(x, y, cellWidth, this.options.cellHeight);

        // Draw cell text
        ctx.fillStyle = this.options.cellTextColor;
        const text = formatCellValue(data[row][col], this.options);
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

        x += cellWidth;
      }
      y += this.options.cellHeight;
    }

    // Draw row indices
    ctx.strokeStyle = this.options.borderColor;

    ctx.textAlign = "right";
    const textX = this.options.rowHeaderWidth - this.options.cellPadding;

    // Top left corner
    ctx.fillStyle = this.options.headerBackgroundColor;
    ctx.fillRect(0, 0, this.options.rowHeaderWidth, this.options.cellHeight);
    ctx.strokeRect(0, 0, this.options.rowHeaderWidth, this.options.cellHeight);

    y = this.options.cellHeight; // Keep the header at the top
    for (let row = startRow; row < endRow; row++) {
      ctx.fillStyle = this.options.headerBackgroundColor;
      ctx.fillRect(0, y, this.options.rowHeaderWidth, this.options.cellHeight);

      ctx.strokeRect(0, y, this.options.rowHeaderWidth, this.options.cellHeight);

      const textY = y + this.options.cellHeight / 2;
      ctx.fillStyle = this.options.headerTextColor;

      ctx.strokeText((row + 1).toString(), textX, textY);
      ctx.fillText((row + 1).toString(), textX, textY);

      y += this.options.cellHeight;
    }
  }

  private drawCellHover(visibleStartRow: number) {
    // Clear the hover canvas
    this.hoverCtx.clearRect(0, 0, this.hoverCanvas.width, this.hoverCanvas.height);

    this.hoverCtx.fillStyle = this.options.hoverColor;
    this.hoverCtx.strokeStyle = this.options.borderColor;

    if (this.hoveredCell) {
      const { row, col } = this.hoveredCell;

      const y = (row - visibleStartRow) * this.options.cellHeight;
      const height = this.options.cellHeight;

      let x = this.colOffsets[col] - this.scrollX;
      let width = this.colWidths[col];

      if (x < this.options.rowHeaderWidth) {
        x = this.options.rowHeaderWidth;
        width = this.colOffsets[col + 1] - this.scrollX - this.options.rowHeaderWidth;
      }

      this.hoverCtx.fillRect(x, y, width, height);
      this.hoverCtx.strokeRect(x, y, width, height);
    }
  }

  private drawColHover() {
    // Clear the hover canvas
    this.hoverCtx.clearRect(0, 0, this.hoverCanvas.width, this.hoverCanvas.height);

    this.hoverCtx.fillStyle = this.options.hoverColor;
    this.hoverCtx.strokeStyle = this.options.borderColor;

    if (this.hoveredCell) {
      const { col } = this.hoveredCell;

      const height = this.hoverCanvas.height - this.options.scrollbarWidth;

      let x = this.colOffsets[col] - this.scrollX;
      let width = this.colWidths[col];
      if (x < this.options.rowHeaderWidth) {
        x = this.options.rowHeaderWidth;
        width = this.colOffsets[col + 1] - this.scrollX - this.options.rowHeaderWidth;
      }

      this.hoverCtx.fillRect(x, 0, width, height);
      this.hoverCtx.strokeRect(x, 0, width, height);
    }
  }

  // TODO: Keep or remove?
  // private drawRowHover(startRow: number, endRow: number) {
  //   // Clear the hover canvas
  //   this.hoverCtx.clearRect(0, 0, this.hoverCanvas.width, this.hoverCanvas.height);

  //   this.hoverCtx.fillStyle = this.options.hoverColor;
  //   this.hoverCtx.strokeStyle = this.options.borderColor;

  //   if (this.hoveredCell) {
  //     const { row } = this.hoveredCell;

  //     if (row < startRow || row > endRow) return;

  //     const x = 0;
  //     const y = (row - startRow) * this.options.cellHeight;
  //     const width = this.selectionCanvas.width - this.options.scrollbarWidth;
  //     const height = this.options.cellHeight;

  //     this.hoverCtx.fillRect(x, y, width, height);
  //     this.hoverCtx.strokeRect(x, y, width, height);
  //   }
  // }

  private drawSelection(visibleStartRow: number) {
    // Clear the selection canvas
    this.selectionCtx.clearRect(0, 0, this.selectionCanvas.width, this.selectionCanvas.height);

    this.drawCellSelection(visibleStartRow);
    this.drawColSelection();
  }

  private drawCellSelection(visibleStartRow: number) {
    // Draw selection
    if (this.selectedCells) {
      const { startRow, endRow, startCol, endCol } = this.selectedCells;
      this.selectionCtx.fillStyle = this.options.selectionColor;

      const minRow = Math.min(startRow, endRow);
      const maxRow = Math.max(startRow, endRow);
      const minCol = Math.min(startCol, endCol);
      const maxCol = Math.max(startCol, endCol);

      const height = this.options.cellHeight;

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const y = (row - visibleStartRow) * this.options.cellHeight;

          let x = this.colOffsets[col] - this.scrollX;
          let width = this.colWidths[col];
          if (x < this.options.rowHeaderWidth) {
            x = this.options.rowHeaderWidth;
            width = this.colOffsets[col + 1] - this.scrollX - this.options.rowHeaderWidth;
          }

          if (x + width > 0 && x < this.canvas.width && y + height > 0 && y < this.canvas.height) {
            this.selectionCtx.fillRect(x, y, width, height);
          }
        }
      }
    }
  }

  private drawColSelection() {
    this.selectionCtx.fillStyle = this.options.selectionColor;
    this.selectionCtx.strokeStyle = this.options.borderColor;

    const height = this.selectionCanvas.height - this.options.scrollbarWidth;
    this.selectedCols.forEach((col) => {
      // Skip if the column is not visible
      if (this.colOffsets[col + 1] - this.scrollX < this.options.rowHeaderWidth) return;

      let x = this.colOffsets[col] - this.scrollX;
      let width = this.colWidths[col];
      if (x < this.options.rowHeaderWidth) {
        x = this.options.rowHeaderWidth;
        width = this.colOffsets[col + 1] - this.scrollX - this.options.rowHeaderWidth;
      }

      this.selectionCtx.fillRect(x, 0, width, height);
      this.selectionCtx.strokeRect(x, 0, width, height);
    });
  }

  // TODO: Keep or remove?
  // private drawRowSelection(startRow: number, endRow: number) {
  //   this.selectionCtx.fillStyle = this.options.selectionColor;
  //   this.selectionCtx.strokeStyle = this.options.borderColor;
  //   this.selectedRows.forEach((row) => {
  //     if (row < startRow || row > endRow) return;

  //     const x = 0;
  //     const y = (row - startRow) * this.options.cellHeight;
  //     const width = this.selectionCanvas.width - this.options.scrollbarWidth;
  //     const height = this.options.cellHeight;

  //     this.selectionCtx.fillRect(x, y, width, height);
  //     this.selectionCtx.strokeRect(x, y, width, height);
  //   });
  // }

  private drawScrollbars() {
    const { ctx, canvas } = this;
    const { width, height } = canvas;

    const hasVerticalScrollbar = this.totalHeight > height;
    const hasHorizontalScrollbar = this.totalWidth > width;

    // Draw vertical scrollbar
    if (hasVerticalScrollbar) {
      const scrollbarHeight = (height / this.totalHeight) * height;
      const scrollbarY = (this.scrollY / this.totalHeight) * height;
      const scrollbarX = width - this.options.scrollbarWidth;

      // Draw track
      ctx.fillStyle = this.options.scrollbarColor;
      ctx.fillRect(scrollbarX, 0, this.options.scrollbarWidth, height - (hasHorizontalScrollbar ? this.options.scrollbarWidth : 0));

      // Draw thumb
      ctx.fillStyle =
        this.mouseState === MouseState.HoveringVerticalScrollbar || this.mouseState === MouseState.DraggingVerticalScrollbar
          ? this.options.scrollbarHoverColor
          : this.options.scrollbarThumbColor;
      ctx.fillRect(scrollbarX, scrollbarY, this.options.scrollbarWidth, scrollbarHeight);
    }

    // Draw horizontal scrollbar
    if (hasHorizontalScrollbar) {
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
      ctx.fillRect(
        scrollbarX,
        scrollbarY,
        scrollbarWidth - (hasVerticalScrollbar ? this.options.scrollbarWidth : 0),
        this.options.scrollbarWidth
      );
    }
  }
}

export const formatCellValue = (value: any, options: SpreadsheetOptions): string => {
  if (value === null || value === undefined) return "NA";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toLocaleString(undefined, options.numberFormat);
  if (value instanceof Date) {
    const format = value.getHours() === 0 && value.getMinutes() === 0 ? options.dateFormat : options.datetimeFormat;
    if (!format) return "NA";

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
};
