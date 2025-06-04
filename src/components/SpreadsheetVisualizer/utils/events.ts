import { CellPosition, SpreadsheetOptions } from "../types";
import { DEFAULT_CELL_HEIGHT } from "@/components/dafults";
interface ExtendedSpreadsheetOptions extends SpreadsheetOptions {
  scrollY: number;
  scrollX: number;
  totalRows: number;
  columnWidths: number[];
  rowIndexWidth: number;
}

interface EventOptions {
  canvas: HTMLCanvasElement;
  options: ExtendedSpreadsheetOptions;
  getCellAtPosition: (x: number, y: number) => CellPosition | null;
  getColumnX: (col: number) => number;
  isCellSelected: (cell: CellPosition) => boolean;
  onSelectionChange: (start: CellPosition | null, end: CellPosition | null) => void;
  onHoverChange: (cell: CellPosition | null) => void;
  onScrollChange: (scrollY: number, scrollX: number) => void;
  onCopy: () => Promise<void>;
}

export function handleMouseDown(e: MouseEvent, options: EventOptions): void {
  const rect = options.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const cell = options.getCellAtPosition(x, y);
  if (cell) {
    // If clicking on a selected cell, deselect
    if (options.isCellSelected(cell)) {
      options.onSelectionChange(null, null);
    } else {
      options.onSelectionChange(cell, cell);
    }
  }
}

export function handleMouseMove(e: MouseEvent, options: EventOptions): void {
  const rect = options.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const cell = options.getCellAtPosition(x, y);
  options.onHoverChange(cell);
}

export function handleMouseUp(): void {
  // Mouse up is handled by the component to update selection state
}

export function handleMouseLeave(options: EventOptions): void {
  options.onHoverChange(null);
}

export function handleWheel(e: WheelEvent, options: EventOptions): void {
  e.preventDefault();

  const cellHeight = options.options.cellHeight ?? DEFAULT_CELL_HEIGHT;
  const deltaY = e.deltaY;
  const deltaX = e.deltaX;

  let newScrollY = options.options.scrollY;
  let newScrollX = options.options.scrollX;

  // Vertical scroll
  if (deltaY !== 0) {
    newScrollY = Math.max(0, options.options.scrollY + deltaY);
    const maxScrollY = Math.max(0, options.options.totalRows * cellHeight - options.canvas.height);
    newScrollY = Math.min(newScrollY, maxScrollY);
  }

  // Horizontal scroll
  if (deltaX !== 0) {
    const totalWidth = options.options.columnWidths.reduce((sum: number, width: number) => sum + width, 0) + options.options.rowIndexWidth;
    newScrollX = Math.max(0, options.options.scrollX + deltaX);
    const maxScrollX = Math.max(0, totalWidth - options.canvas.width);
    newScrollX = Math.min(newScrollX, maxScrollX);
  }

  if (newScrollY !== options.options.scrollY || newScrollX !== options.options.scrollX) {
    options.onScrollChange(newScrollY, newScrollX);
  }
}

export function handleKeyDown(e: KeyboardEvent, options: EventOptions): void {
  // Handle Ctrl+C or Cmd+C
  if ((e.ctrlKey || e.metaKey) && e.key === "c") {
    options.onCopy().catch(console.error);
    return;
  }

  // Handle arrow keys for navigation
  const cellHeight = options.options.cellHeight ?? DEFAULT_CELL_HEIGHT;
  let newScrollY = options.options.scrollY;
  let newScrollX = options.options.scrollX;

  switch (e.key) {
    case "ArrowUp":
      newScrollY = Math.max(0, options.options.scrollY - cellHeight);
      break;
    case "ArrowDown":
      newScrollY = Math.min(options.options.totalRows * cellHeight - options.canvas.height, options.options.scrollY + cellHeight);
      break;
    case "ArrowLeft":
      newScrollX = Math.max(0, options.options.scrollX - 50);
      break;
    case "ArrowRight":
      newScrollX = Math.min(
        options.options.columnWidths.reduce((sum: number, width: number) => sum + width, 0) - options.canvas.width,
        options.options.scrollX + 50
      );
      break;
    case "PageUp":
      newScrollY = Math.max(0, options.options.scrollY - options.canvas.height);
      break;
    case "PageDown":
      newScrollY = Math.min(
        options.options.totalRows * cellHeight - options.canvas.height,
        options.options.scrollY + options.canvas.height
      );
      break;
    case "Home":
      newScrollY = 0;
      break;
    case "End":
      newScrollY = options.options.totalRows * cellHeight - options.canvas.height;
      break;
    default:
      return;
  }

  if (newScrollY !== options.options.scrollY || newScrollX !== options.options.scrollX) {
    options.onScrollChange(newScrollY, newScrollX);
  }
}

export function setupEventListeners(canvas: HTMLCanvasElement, options: EventOptions): () => void {
  const mouseDownHandler = (e: MouseEvent) => handleMouseDown(e, options);
  const mouseMoveHandler = (e: MouseEvent) => handleMouseMove(e, options);
  const mouseUpHandler = () => handleMouseUp();
  const mouseLeaveHandler = () => handleMouseLeave(options);
  const wheelHandler = (e: WheelEvent) => handleWheel(e, options);
  const keyDownHandler = (e: KeyboardEvent) => handleKeyDown(e, options);

  canvas.addEventListener("mousedown", mouseDownHandler);
  canvas.addEventListener("mousemove", mouseMoveHandler);
  canvas.addEventListener("mouseup", mouseUpHandler);
  canvas.addEventListener("mouseleave", mouseLeaveHandler);
  canvas.addEventListener("wheel", wheelHandler);
  document.addEventListener("keydown", keyDownHandler);

  // Return cleanup function
  return () => {
    canvas.removeEventListener("mousedown", mouseDownHandler);
    canvas.removeEventListener("mousemove", mouseMoveHandler);
    canvas.removeEventListener("mouseup", mouseUpHandler);
    canvas.removeEventListener("mouseleave", mouseLeaveHandler);
    canvas.removeEventListener("wheel", wheelHandler);
    document.removeEventListener("keydown", keyDownHandler);
  };
}
