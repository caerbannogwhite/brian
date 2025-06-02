import { Column, CellStyle, SpreadsheetOptions } from '../types';

export function parseFormat(format: string | undefined, type: "number" | "date" | "datetime"): any {
  if (!format) return undefined;

  try {
    return JSON.parse(format);
  } catch (e) {
    if (type === "date" || type === "datetime") {
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

      const matchedFormat = formatMap[format];
      if (matchedFormat) {
        return matchedFormat;
      }

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
    return undefined;
  }
}

export function getFormatOptions(column: Column, type: "number" | "date" | "datetime", options: SpreadsheetOptions): any {
  if (column.format) {
    const parsedFormat = parseFormat(column.format, type);
    if (parsedFormat) return parsedFormat;
  }

  switch (type) {
    case "date":
      return parseFormat(options.dateFormat?.toString(), "date");
    case "datetime":
      return parseFormat(options.datetimeFormat?.toString(), "date");
    case "number":
      return parseFormat(options.numberFormat?.toString(), "number");
    default:
      return undefined;
  }
}

export function formatCellValue(value: any, column: Column, options: SpreadsheetOptions): { text: string; style: Partial<CellStyle> } {
  if (value === null || value === undefined) {
    return {
      text: "NA",
      style: options.nullStyle || { textColor: "#cc0000" },
    };
  }

  switch (column.dataType) {
    case "integer":
    case "decimal":
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        const formatOptions = getFormatOptions(column, "number", options);
        const formattedValue = formatOptions 
          ? new Intl.NumberFormat(undefined, formatOptions).format(numValue) 
          : numValue.toString();
        return {
          text: formattedValue,
          style: options.numericStyle || { textAlign: "right", textColor: "#0066cc" },
        };
      }
      break;

    case "date":
    case "datetime":
      if (value instanceof Date || !isNaN(Date.parse(value))) {
        const dateValue = new Date(value);
        const formatOptions = getFormatOptions(column, column.dataType, options);
        const formattedValue = formatOptions
          ? new Intl.DateTimeFormat(undefined, formatOptions).format(dateValue)
          : column.dataType === "date"
          ? dateValue.toLocaleDateString()
          : dateValue.toLocaleString();
        return {
          text: formattedValue,
          style: options.dateStyle || { textAlign: "right", textColor: "#006633" },
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

  return {
    text: value.toString(),
    style: {},
  };
} 