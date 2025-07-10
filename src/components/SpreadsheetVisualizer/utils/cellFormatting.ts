import { DEFAULT_NA_TEXT } from "../defaults";
import {
  getDefaultBooleanStyle,
  getDefaultNumericStyle,
  getDefaultStringStyle,
  getDefaultDateStyle,
  getDefaultDatetimeStyle,
  getDefaultNullStyle,
} from "../defaults";
import { Column, CellStyle, SpreadsheetOptions } from "../types";

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
    const parsedFormat = parseFormat(column.format.toString(), type);
    if (parsedFormat) return parsedFormat;
  }

  switch (type) {
    case "date":
      return parseFormat(options.dateFormat?.toString(), "date");
    case "datetime":
      return parseFormat(options.datetimeFormat?.toString(), "datetime");
    case "number":
      return parseFormat(options.numberFormat?.toString(), "number");
    default:
      return undefined;
  }
}

export function formatCellStyle(value: any, column: Column, options: SpreadsheetOptions): { text: string; style: Partial<CellStyle> } {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    const nullStyle = getDefaultNullStyle();
    return {
      text: options.naText || DEFAULT_NA_TEXT,
      style: {
        textColor: nullStyle.textColor,
        backgroundColor: nullStyle.backgroundColor,
        textAlign: "center",
      },
    };
  }

  // Handle different data types with theme-aware styling
  switch (column.dataType) {
    case "number":
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        const formatOptions = getFormatOptions(column, "number", options);
        const formattedValue = formatOptions ? new Intl.NumberFormat(undefined, formatOptions).format(numValue) : numValue.toString();

        const numericStyle = getDefaultNumericStyle();
        return {
          text: formattedValue,
          style: {
            textAlign: "right",
            textColor: numericStyle.textColor,
            backgroundColor: numericStyle.backgroundColor,
          },
        };
      }
      break;

    case "date":
      if (value instanceof Date || !isNaN(Date.parse(value))) {
        const dateValue = new Date(value);
        const formatOptions = getFormatOptions(column, "date", options);
        const formattedValue = formatOptions
          ? new Intl.DateTimeFormat(undefined, formatOptions).format(dateValue)
          : dateValue.toLocaleDateString();

        const dateStyle = getDefaultDateStyle();
        return {
          text: formattedValue,
          style: {
            textAlign: "right",
            textColor: dateStyle.textColor,
            backgroundColor: dateStyle.backgroundColor,
          },
        };
      }
      break;

    case "datetime":
      if (value instanceof Date || !isNaN(Date.parse(value))) {
        const dateValue = new Date(value);
        const formatOptions = getFormatOptions(column, "datetime", options);
        const formattedValue = formatOptions
          ? new Intl.DateTimeFormat(undefined, formatOptions).format(dateValue)
          : dateValue.toLocaleString();

        const datetimeStyle = getDefaultDatetimeStyle();
        return {
          text: formattedValue,
          style: {
            textAlign: "right",
            textColor: datetimeStyle.textColor,
            backgroundColor: datetimeStyle.backgroundColor,
          },
        };
      }
      break;

    case "boolean":
      const booleanStyle = getDefaultBooleanStyle();
      return {
        text: value ? "Yes" : "No",
        style: {
          textAlign: "center",
          textColor: booleanStyle.textColor,
          backgroundColor: booleanStyle.backgroundColor,
        },
      };

    case "string":
    default:
      const stringStyle = getDefaultStringStyle();
      return {
        text: value.toString(),
        style: {
          textAlign: "left",
          textColor: stringStyle.textColor,
          backgroundColor: stringStyle.backgroundColor,
        },
      };
  }

  // Fallback for any unhandled cases
  const stringStyle = getDefaultStringStyle();
  return {
    text: value.toString(),
    style: {
      textAlign: "left",
      textColor: stringStyle.textColor,
      backgroundColor: stringStyle.backgroundColor,
    },
  };
}

export const formatCellValue = (value: any, options: SpreadsheetOptions): string => {
  // Handle null/undefined values
  if (value === null || value === undefined) {
    return options.naText || DEFAULT_NA_TEXT;
  }

  // Handle different data types
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number") {
    const formatOptions = options.numberFormat;
    return formatOptions ? new Intl.NumberFormat(undefined, formatOptions).format(value) : value.toLocaleString();
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  if (value instanceof Date) {
    const hasTime = value.getHours() !== 0 || value.getMinutes() !== 0 || value.getSeconds() !== 0;
    const formatString = hasTime ? options.datetimeFormat : options.dateFormat;

    if (formatString && typeof formatString === "string") {
      // Handle simple string format patterns
      return formatString.replace(/yyyy|MM|dd|HH|mm|ss/g, (match) => {
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

    // Fallback to standard formatting
    return hasTime ? value.toLocaleString() : value.toLocaleDateString();
  }

  // Fallback for any other types
  return String(value);
};
