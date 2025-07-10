import { getDefaultBorderColor, DEFAULT_BORDER_WIDTH } from "@/components/SpreadsheetVisualizer/defaults";
import { Column, CellStyle, CellPosition, SpreadsheetOptions } from "../types";
import { formatCellStyle } from "./cellFormatting";

interface DrawingOptions extends SpreadsheetOptions {
  scrollY: number;
  scrollX: number;
  rowIndexWidth: number;
  columnWidths: number[];
  selectionColor: string;
  selectionBorderColor: string;
  borderColor: string;
  borderWidth: number;
  cellHeight: number;
  headerHeight: number;
  hoverColor: string;
  hoverBorderColor: string;
}

export function measureText(ctx: CanvasRenderingContext2D, text: string, style: CellStyle, padding: number): number {
  ctx.font = `${style.fontSize || 14}px ${style.fontFamily || "Consolas, 'Courier New', monospace"}`;
  const metrics = ctx.measureText(text);
  return metrics.width + (style.padding || 8) * 2 + padding;
}

export function drawCell(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  value: any,
  style: CellStyle,
  column: Column | undefined,
  options: SpreadsheetOptions
): void {
  const borderColor = options.borderColor ?? getDefaultBorderColor();
  const borderWidth = options.borderWidth ?? DEFAULT_BORDER_WIDTH;

  // Draw cell background
  ctx.fillStyle = style.backgroundColor || "#ffffff";
  ctx.fillRect(x, y, width, height);

  // Draw cell border
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(x, y, width, height);

  // Format and style the cell value
  const { text, style: typeStyle } = column ? formatCellStyle(value, column, options) : { text: value, style: {} };
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

export function drawSelection(
  ctx: CanvasRenderingContext2D,
  selection: { start: CellPosition | null; end: CellPosition | null },
  options: DrawingOptions,
  getColumnX: (col: number) => number,
  canvas: HTMLCanvasElement,
  scrollbarWidth: number
): void {
  if (!selection.start || !selection.end) return;

  const startRow = Math.min(selection.start.row, selection.end.row);
  const endRow = Math.max(selection.start.row, selection.end.row);
  const startCol = Math.min(selection.start.col, selection.end.col);
  const endCol = Math.max(selection.start.col, selection.end.col);

  const { headerHeight, cellHeight } = options;
  const visibleWidth = canvas.width - scrollbarWidth;
  const visibleHeight = canvas.height - scrollbarWidth;

  // Draw selection rectangles
  for (let row = startRow; row <= endRow; row++) {
    const rowY = row === -1 ? 0 : headerHeight + row * cellHeight - options.scrollY;
    if (rowY + cellHeight < 0 || rowY > visibleHeight) continue;

    const height = row === -1 ? headerHeight : cellHeight;

    for (let col = startCol; col <= endCol; col++) {
      const x = getColumnX(col) - options.scrollX;
      const width = col === -1 ? options.rowIndexWidth : options.columnWidths[col];

      if (x + width < 0 || x > visibleWidth) continue;

      // Draw selection background
      ctx.fillStyle = options.selectionColor;
      ctx.fillRect(x, rowY, width, height);

      // Draw selection border
      ctx.strokeStyle = options.selectionBorderColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(x, rowY, width, height);
    }
  }
}

export function drawHover(
  ctx: CanvasRenderingContext2D,
  hover: { cell: CellPosition | null },
  options: DrawingOptions,
  getColumnX: (col: number) => number,
  canvas: HTMLCanvasElement,
  scrollbarWidth: number,
  isCellSelected: (cell: CellPosition) => boolean
): void {
  if (!hover.cell) return;

  const { headerHeight, cellHeight } = options;
  const { row, col } = hover.cell;
  const visibleWidth = canvas.width - scrollbarWidth;
  const visibleHeight = canvas.height - scrollbarWidth;

  if (isCellSelected(hover.cell)) return;

  const rowY = row === -1 ? 0 : headerHeight + row * cellHeight - options.scrollY;
  const height = row === -1 ? headerHeight : cellHeight;
  const x = getColumnX(col) - options.scrollX;
  const width = col === -1 ? options.rowIndexWidth : options.columnWidths[col];

  if (rowY + height < 0 || rowY > visibleHeight || x + width < 0 || x > visibleWidth) return;

  // Draw hover background
  ctx.fillStyle = options.hoverColor;
  ctx.fillRect(x, rowY, width, height);

  // Draw hover border
  ctx.strokeStyle = options.hoverBorderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, rowY, width, height);
}

export function minMax(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}
