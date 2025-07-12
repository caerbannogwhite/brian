import { ScrollbarState } from "../internals";

interface ScrollbarOptions {
  width: number;
  color: string;
  thumbColor: string;
  hoverColor: string;
  canvas: HTMLCanvasElement;
  totalRows: number;
  totalColumns: number;
  cellHeight: number;
  headerHeight: number;
  rowIndexWidth: number;
  columnWidths: number[];
  scrollY: number;
  scrollX: number;
}

export function isPointInVerticalScrollbar(x: number, y: number, options: ScrollbarOptions): boolean {
  return x >= options.canvas.width - options.width && y >= 0 && y <= options.canvas.height;
}

export function isPointInHorizontalScrollbar(x: number, y: number, options: ScrollbarOptions): boolean {
  return y >= options.canvas.height - options.width && x >= 0 && x <= options.canvas.width;
}

export function getVerticalScrollbarHeight(options: ScrollbarOptions): number {
  return options.canvas.height - (needsHorizontalScrollbar(options) ? options.width : 0);
}

export function getHorizontalScrollbarWidth(options: ScrollbarOptions): number {
  return options.canvas.width - (needsVerticalScrollbar(options) ? options.width : 0);
}

export function getVerticalScrollbarThumbHeight(options: ScrollbarOptions): number {
  const contentHeight = options.totalRows * options.cellHeight;
  const viewportHeight = options.canvas.height - options.headerHeight;
  return Math.max(30, (viewportHeight / contentHeight) * getVerticalScrollbarHeight(options));
}

export function getHorizontalScrollbarThumbWidth(options: ScrollbarOptions): number {
  const contentWidth = getTotalWidth(options);
  const viewportWidth = options.canvas.width - options.rowIndexWidth;
  return Math.max(30, (viewportWidth / contentWidth) * getHorizontalScrollbarWidth(options));
}

export function getVerticalScrollbarThumbY(options: ScrollbarOptions): number {
  const scrollRatio = options.scrollY / (options.totalRows * options.cellHeight - options.canvas.height);
  return scrollRatio * (getVerticalScrollbarHeight(options) - getVerticalScrollbarThumbHeight(options));
}

export function getHorizontalScrollbarThumbX(options: ScrollbarOptions): number {
  const scrollRatio = options.scrollX / (getTotalWidth(options) - options.canvas.width);
  return scrollRatio * (getHorizontalScrollbarWidth(options) - getHorizontalScrollbarThumbWidth(options));
}

export function needsVerticalScrollbar(options: ScrollbarOptions): boolean {
  return options.totalRows * options.cellHeight > options.canvas.height;
}

export function needsHorizontalScrollbar(options: ScrollbarOptions): boolean {
  return getTotalWidth(options) > options.canvas.width;
}

export function getTotalWidth(options: ScrollbarOptions): number {
  return options.columnWidths.reduce((sum, width) => sum + width, 0) + options.rowIndexWidth;
}

export function getMaxScrollY(options: ScrollbarOptions): number {
  return Math.max(0, options.totalRows * options.cellHeight - options.canvas.height);
}

export function getMaxScrollX(options: ScrollbarOptions): number {
  return Math.max(0, getTotalWidth(options) - options.canvas.width);
}

export function drawScrollbars(ctx: CanvasRenderingContext2D, options: ScrollbarOptions, state: ScrollbarState): void {
  // Draw vertical scrollbar
  if (needsVerticalScrollbar(options)) {
    const scrollbarX = options.canvas.width - options.width;
    const scrollbarHeight = getVerticalScrollbarHeight(options);

    // Draw track
    ctx.fillStyle = options.color;
    ctx.fillRect(scrollbarX, 0, options.width, scrollbarHeight);

    // Draw thumb
    const thumbHeight = getVerticalScrollbarThumbHeight(options);
    const thumbY = getVerticalScrollbarThumbY(options);
    ctx.fillStyle = state.isHoveringVertical ? options.hoverColor : options.thumbColor;
    ctx.fillRect(scrollbarX, thumbY, options.width, thumbHeight);
  }

  // Draw horizontal scrollbar
  if (needsHorizontalScrollbar(options)) {
    const scrollbarY = options.canvas.height - options.width;
    const scrollbarWidth = getHorizontalScrollbarWidth(options);

    // Draw track
    ctx.fillStyle = options.color;
    ctx.fillRect(0, scrollbarY, scrollbarWidth, options.width);

    // Draw thumb
    const thumbWidth = getHorizontalScrollbarThumbWidth(options);
    const thumbX = getHorizontalScrollbarThumbX(options);
    ctx.fillStyle = state.isHoveringHorizontal ? options.hoverColor : options.thumbColor;
    ctx.fillRect(thumbX, scrollbarY, thumbWidth, options.width);
  }
}

export function handleScrollbarMouseDown(
  x: number,
  y: number,
  options: ScrollbarOptions,
  _: ScrollbarState
): { isDraggingVertical: boolean; isDraggingHorizontal: boolean } {
  if (isPointInVerticalScrollbar(x, y, options)) {
    return { isDraggingVertical: true, isDraggingHorizontal: false };
  }

  if (isPointInHorizontalScrollbar(x, y, options)) {
    return { isDraggingVertical: false, isDraggingHorizontal: true };
  }

  return { isDraggingVertical: false, isDraggingHorizontal: false };
}

export function handleScrollbarMouseMove(
  x: number,
  y: number,
  options: ScrollbarOptions,
  state: ScrollbarState
): { newScrollY: number | null; newScrollX: number | null } {
  let newScrollY: number | null = null;
  let newScrollX: number | null = null;

  if (state.isDraggingVertical) {
    const deltaY = y - state.lastMouseY;
    const scrollRatio = deltaY / getVerticalScrollbarHeight(options);
    const scrollDelta = scrollRatio * (options.totalRows * options.cellHeight - options.canvas.height);
    newScrollY = Math.max(0, Math.min(options.scrollY + scrollDelta, getMaxScrollY(options)));
  }

  if (state.isDraggingHorizontal) {
    const deltaX = x - state.lastMouseX;
    const scrollRatio = deltaX / getHorizontalScrollbarWidth(options);
    const scrollDelta = scrollRatio * (getTotalWidth(options) - options.canvas.width);
    newScrollX = Math.max(0, Math.min(options.scrollX + scrollDelta, getMaxScrollX(options)));
  }

  return { newScrollY, newScrollX };
}
