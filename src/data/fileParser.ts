import { DefaultDataProvider } from "./providers/DefaultDataProvider";
import { Column, DatasetMetadata, DataType, DataProvider } from "./types";

export interface ParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  fileName?: string;
}

/**
 * Parse a CSV/TSV file and convert it to DatasetMetadata format
 */
export async function parseFile(file: File, options: ParseOptions = {}): Promise<DataProvider> {
  const { delimiter, hasHeader = true, fileName } = options;

  // Read file content
  const content = await readFileAsText(file);

  // Determine delimiter if not provided
  const detectedDelimiter = delimiter || detectDelimiter(content);

  // Parse CSV content
  const { headers, rows } = parseCSV(content, detectedDelimiter, hasHeader);

  // Infer column types from data
  const columns = inferColumns(headers, rows);

  // Generate dataset metadata
  // const now = new Date().toISOString();
  const datasetName = (fileName || file.name).replace(/\.[^/.]+$/, "").toUpperCase();

  const dataset: DatasetMetadata = {
    name: datasetName,
    fileName: file.name,
    description: "Imported from file",
    totalRows: rows.length,
    totalColumns: columns.length,
    columns,
  };

  return new DefaultDataProvider(file.name, dataset.totalRows, dataset.totalColumns, columns, rows);
}

/**
 * Read file as text with proper encoding
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file, "utf-8");
  });
}

/**
 * Detect CSV delimiter by checking common separators
 */
function detectDelimiter(content: string): string {
  const delimiters = [",", "\t", ";", "|"];
  const firstLine = content.split("\n")[0] || "";

  // Count occurrences of each delimiter
  const counts = delimiters.map((delimiter) => ({
    delimiter,
    count: (firstLine.match(new RegExp(`\\${delimiter}`, "g")) || []).length,
  }));

  // Return the delimiter with the highest count
  const best = counts.reduce((max, current) => (current.count > max.count ? current : max));

  return best.count > 0 ? best.delimiter : ",";
}

/**
 * Parse CSV content into headers and rows
 */
function parseCSV(content: string, delimiter: string, hasHeader: boolean): { headers: string[]; rows: any[][] } {
  const lines = content.split("\n").filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    throw new Error("File is empty");
  }

  // Parse first line as headers or generate them
  let headers: string[];
  let dataStartIndex: number;

  if (hasHeader) {
    headers = parseCSVLine(lines[0], delimiter);
    dataStartIndex = 1;
  } else {
    // Generate column headers like "Column1", "Column2", etc.
    const firstRowColumns = parseCSVLine(lines[0], delimiter);
    headers = firstRowColumns.map((_, index) => `Column${index + 1}`);
    dataStartIndex = 0;
  }

  // Parse data rows
  const rows: any[][] = [];
  for (let i = dataStartIndex; i < lines.length; i++) {
    const row = parseCSVLine(lines[i], delimiter);
    // Ensure row has same length as headers
    while (row.length < headers.length) {
      row.push("");
    }
    if (row.length > headers.length) {
      row.splice(headers.length);
    }
    rows.push(row);
  }

  return { headers, rows };
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  // Add last field
  result.push(current.trim());

  return result;
}

/**
 * Infer column types
 */
function inferColumns(headers: string[], rows: any[][]): Column[] {
  return headers.map((header, index) => {
    const values = rows.map((row) => row[index]).filter((val) => val !== null && val !== undefined && val !== "");
    const dataType = inferDataType(values);
    const maxLength = Math.max(...values.map((val) => String(val || "").length));

    return {
      name: header.toUpperCase(),
      key: header.toUpperCase(),
      label: header
        .toLowerCase()
        .replace(/[_-]/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase()),
      dataType,
      length: Math.max(maxLength, 8),
      format: undefined,
    };
  });
}

/**
 * Infer data type from sample values
 */
function inferDataType(values: any[]): DataType {
  if (values.length === 0) return "string";

  // Sample first 100 values for performance
  const sample = values.slice(0, 100);

  let numericCount = 0;
  let dateCount = 0;
  let booleanCount = 0;

  for (const value of sample) {
    const str = String(value).trim().toLowerCase();

    // Check for boolean
    if (str === "true" || str === "false" || str === "yes" || str === "no" || str === "1" || str === "0") {
      booleanCount++;
    }

    // Check for number
    if (!isNaN(Number(str)) && str !== "") {
      numericCount++;
    }

    // Check for date
    if (isValidDate(str)) {
      dateCount++;
    }
  }

  const total = sample.length;
  const threshold = 0.8; // 80% threshold

  if (numericCount / total >= threshold) {
    return Number.isInteger(Number(sample[0])) ? "integer" : "float";
  }

  if (dateCount / total >= threshold) {
    return hasTimeComponent(sample) ? "datetime" : "date";
  }

  if (booleanCount / total >= threshold) {
    return "boolean";
  }

  return "string";
}

/**
 * Check if a string represents a valid date
 */
function isValidDate(str: string): boolean {
  if (!str || str.length < 8) return false;

  const date = new Date(str);
  return !isNaN(date.getTime()) && str.match(/\d{4}/) !== null;
}

/**
 * Check if date samples contain time components
 */
function hasTimeComponent(values: any[]): boolean {
  for (const value of values.slice(0, 10)) {
    const str = String(value).trim();
    if (str.includes(":") || str.includes("T")) {
      return true;
    }
  }
  return false;
}

/**
 * Get supported file types for drag and drop
 */
export function getSupportedFileTypes(): string[] {
  return ["text/csv", "text/tab-separated-values", "text/plain", "application/csv", ".csv", ".tsv", ".txt"];
}

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  const supportedTypes = getSupportedFileTypes();
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  return supportedTypes.some((type) => fileType.includes(type.replace(".", "")) || fileName.endsWith(type));
}
