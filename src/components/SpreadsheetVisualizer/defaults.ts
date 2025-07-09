import { getThemeColors } from './utils/theme';

const DEFAULT_CONTAINER_WIDTH = 1200;
const DEFAULT_CONTAINER_HEIGHT = 800;

const DEFAULT_MAX_HEIGHT = Number.MAX_SAFE_INTEGER;
const DEFAULT_MAX_WIDTH = Number.MAX_SAFE_INTEGER;

const DEFAULT_MIN_HEIGHT = 400;
const DEFAULT_MIN_WIDTH = 600;

const DEFAULT_HEIGHT = DEFAULT_CONTAINER_HEIGHT;
const DEFAULT_WIDTH = DEFAULT_CONTAINER_WIDTH;

const DEFAULT_CELL_HEIGHT = 24;
const DEFAULT_MIN_CELL_WIDTH = 100;
const DEFAULT_CELL_PADDING = 8;
const DEFAULT_ROW_HEADER_WIDTH = 60;

const DEFAULT_BORDER_WIDTH = 1;
const DEFAULT_FONT_FAMILY = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
const DEFAULT_FONT_SIZE = 13;
const DEFAULT_HEADER_FONT_SIZE = 13;

// Get theme-aware colors
function getDefaultColors() {
  return getThemeColors();
}

// Export functions that return theme-aware defaults
export function getDefaultHeaderBackgroundColor(): string {
  return getDefaultColors().headerBackgroundColor;
}

export function getDefaultHeaderTextColor(): string {
  return getDefaultColors().headerTextColor;
}

export function getDefaultCellBackgroundColor(): string {
  return getDefaultColors().cellBackgroundColor;
}

export function getDefaultCellTextColor(): string {
  return getDefaultColors().cellTextColor;
}

export function getDefaultBorderColor(): string {
  return getDefaultColors().borderColor;
}

export function getDefaultSelectionColor(): string {
  return getDefaultColors().selectionColor;
}

export function getDefaultHoverColor(): string {
  return getDefaultColors().hoverColor;
}

export function getDefaultScrollbarColor(): string {
  return getDefaultColors().scrollbarColor;
}

export function getDefaultScrollbarThumbColor(): string {
  return getDefaultColors().scrollbarThumbColor;
}

export function getDefaultScrollbarHoverColor(): string {
  return getDefaultColors().scrollbarHoverColor;
}

export function getDefaultBooleanStyle() {
  return getDefaultColors().booleanStyle;
}

export function getDefaultNumericStyle() {
  return getDefaultColors().numericStyle;
}

export function getDefaultStringStyle() {
  return getDefaultColors().stringStyle;
}

export function getDefaultDateStyle() {
  return getDefaultColors().dateStyle;
}

export function getDefaultDatetimeStyle() {
  return getDefaultColors().datetimeStyle;
}

export function getDefaultNullStyle() {
  return getDefaultColors().nullStyle;
}

// Legacy constants for backward compatibility (now theme-aware)
const DEFAULT_HEADER_BACKGROUND_COLOR = getDefaultHeaderBackgroundColor();
const DEFAULT_HEADER_TEXT_COLOR = getDefaultHeaderTextColor();
const DEFAULT_CELL_BACKGROUND_COLOR = getDefaultCellBackgroundColor();
const DEFAULT_CELL_TEXT_COLOR = getDefaultCellTextColor();
const DEFAULT_BORDER_COLOR = getDefaultBorderColor();
const DEFAULT_SELECTION_COLOR = getDefaultSelectionColor();
const DEFAULT_HOVER_COLOR = getDefaultHoverColor();

const DEFAULT_SCROLLBAR_WIDTH = 12;
const DEFAULT_SCROLLBAR_COLOR = getDefaultScrollbarColor();
const DEFAULT_SCROLLBAR_THUMB_COLOR = getDefaultScrollbarThumbColor();
const DEFAULT_SCROLLBAR_HOVER_COLOR = getDefaultScrollbarHoverColor();

const DEFAULT_BOOLEAN_STYLE = getDefaultBooleanStyle();
const DEFAULT_NUMERIC_STYLE = getDefaultNumericStyle();
const DEFAULT_STRING_STYLE = getDefaultStringStyle();
const DEFAULT_DATE_STYLE = getDefaultDateStyle();
const DEFAULT_DATETIME_STYLE = getDefaultDatetimeStyle();
const DEFAULT_NULL_STYLE = getDefaultNullStyle();

const DEFAULT_DATE_FORMAT = "yyyy-MM-dd";
const DEFAULT_DATETIME_FORMAT = "yyyy-MM-dd HH:mm:ss";
const DEFAULT_NUMBER_FORMAT = { minimumFractionDigits: 2, maximumFractionDigits: 2 };

export {
  DEFAULT_CONTAINER_WIDTH,
  DEFAULT_CONTAINER_HEIGHT,
  DEFAULT_MAX_HEIGHT,
  DEFAULT_MAX_WIDTH,
  DEFAULT_MIN_HEIGHT,
  DEFAULT_MIN_WIDTH,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  DEFAULT_CELL_HEIGHT,
  DEFAULT_MIN_CELL_WIDTH,
  DEFAULT_CELL_PADDING,
  DEFAULT_ROW_HEADER_WIDTH,
  DEFAULT_BORDER_WIDTH,
  DEFAULT_FONT_FAMILY,
  DEFAULT_FONT_SIZE,
  DEFAULT_HEADER_FONT_SIZE,
  DEFAULT_HEADER_BACKGROUND_COLOR,
  DEFAULT_HEADER_TEXT_COLOR,
  DEFAULT_CELL_BACKGROUND_COLOR,
  DEFAULT_CELL_TEXT_COLOR,
  DEFAULT_BORDER_COLOR,
  DEFAULT_SELECTION_COLOR,
  DEFAULT_HOVER_COLOR,
  DEFAULT_SCROLLBAR_WIDTH,
  DEFAULT_SCROLLBAR_COLOR,
  DEFAULT_SCROLLBAR_THUMB_COLOR,
  DEFAULT_SCROLLBAR_HOVER_COLOR,
  DEFAULT_DATE_FORMAT,
  DEFAULT_DATETIME_FORMAT,
  DEFAULT_NUMBER_FORMAT,
  DEFAULT_BOOLEAN_STYLE,
  DEFAULT_NUMERIC_STYLE,
  DEFAULT_STRING_STYLE,
  DEFAULT_DATE_STYLE,
  DEFAULT_DATETIME_STYLE,
  DEFAULT_NULL_STYLE,
};
