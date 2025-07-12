export type DataType = "null" | "boolean" | "integer" | "float" | "string" | "date" | "datetime";

export interface Column {
  name: string;
  key: string;
  label?: string;
  dataType: DataType;
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
export interface DataProvider {
  getMetadata(): Promise<DatasetMetadata>;
  fetchData(startRow: number, endRow: number, startCol: number, endCol: number): Promise<any[][]>;
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
  maxCellWidth?: number;
  cellPadding?: number;
  rowHeaderWidth?: number;

  // Rendering options
  textRendering?: "auto" | "geometricPrecision";
  letterSpacing?: string;
  imageSmoothingEnabled?: boolean;
  imageSmoothingQuality?: "low" | "medium" | "high";

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

  naText?: string;
  trueText?: string;
  falseText?: string;
  textAlign?: "left" | "center" | "right";

  numberFormat?: Intl.NumberFormatOptions;
  dateFormat?: string;
  datetimeFormat?: string;
  datetimeLocale?: Intl.Locale;

  maxFormatGuessLength?: number;
  percentFormatGuessFit?: number;
}
