export interface Column {
  name: string;
  key: string;
  label?: string;
  dataType: "string" | "number" | "date" | "datetime" | "boolean" | "null";
  length?: number;
  format?: string | Intl.NumberFormatOptions;
}

export interface DatasetMetadata {
  name: string;
  fileName?: string;
  description?: string;
  totalRows: number;
  totalColumns: number;
  columns: Column[];
}

export interface CellStyle {
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  padding?: number;
  numericColor?: string;
  dateColor?: string;
  nullColor?: string;
}

export interface SpreadsheetOptions {
  // Viewport options
  maxHeight?: number;
  maxWidth?: number;
  minHeight?: number;
  minWidth?: number;
  height?: number | undefined;
  width?: number | undefined;

  // Cell options
  cellHeight?: number;
  minCellWidth?: number;
  cellPadding?: number;
  rowHeaderWidth?: number;

  // Style options
  borderWidth?: number;
  fontFamily?: string;
  fontSize?: number;
  headerFontSize?: number;
  headerBackgroundColor?: string;
  headerTextColor?: string;
  cellBackgroundColor?: string;
  cellTextColor?: string;
  borderColor?: string;
  selectionColor?: string;
  hoverColor?: string;

  // Scrollbar options
  scrollbarWidth?: number;
  scrollbarColor?: string;
  scrollbarThumbColor?: string;
  scrollbarHoverColor?: string;

  // Format options
  booleanStyle?: CellStyle;
  numericStyle?: CellStyle;
  stringStyle?: CellStyle;
  dateStyle?: CellStyle;
  datetimeStyle?: CellStyle;
  nullStyle?: CellStyle;

  numberFormat?: Intl.NumberFormatOptions;
  dateFormat?: string;
  datetimeFormat?: string;
}

export interface DataProvider {
  getMetadata(): Promise<DatasetMetadata>;
  fetchData(startRow: number, endRow: number, startCol: number, endCol: number): Promise<any[][]>;
}

export interface CellPosition {
  row: number;
  col: number;
}

export interface ScrollbarState {
  isHoveringVertical: boolean;
  isHoveringHorizontal: boolean;
  isDraggingVertical: boolean;
  isDraggingHorizontal: boolean;
  lastMouseY: number;
  lastMouseX: number;
}

export interface SelectionState {
  isSelecting: boolean;
  start: CellPosition | null;
  end: CellPosition | null;
  color: string;
  borderColor: string;
}

export interface HoverState {
  cell: CellPosition | null;
  color: string;
  borderColor: string;
}

export interface ScrollState {
  scrollY: number;
  scrollX: number;
  totalRows: number;
  totalColumns: number;
  visibleRows: number;
  visibleColumns: number;
  rowBuffer: number;
  dataCache: Map<number, any[]>;
  isFetching: boolean;
  lastFetchStart: number;
  lastFetchEnd: number;
}
