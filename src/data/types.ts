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
  label?: string;
  totalRows: number;
  totalColumns: number;
  columns: Column[];
}

export interface DataProvider {
  getMetadata(): Promise<DatasetMetadata>;
  fetchData(startRow: number, endRow: number, startCol: number, endCol: number): Promise<any[][]>;
}

export interface CdiscColumn {
  itemOID: string;
  name: string;
  label: string;
  dataType: string;
  length: number;
  keySequence?: number;
  format?: string;
}

export interface CdiscDataset {
  datasetJSONCreationDateTime: string;
  datasetJSONVersion: string;
  fileOID: string;
  dbLastModifiedDateTime: string;
  originator: string;
  sourceSystem: {
    name: string;
    version: string;
  };
  studyOID: string;
  metaDataVersionOID: string;
  metaDataRef: string;
  itemGroupOID: string;
  records: number;
  name: string;
  label: string;
  columns: CdiscColumn[];
  rows: (string | number | Date | boolean | null)[][];
}

export function getColumns(dataset: CdiscDataset) {
  return dataset.columns.map((col) => ({
    name: col.name,
    label: col.label,
    length: col.length,
    key: col.name,
    dataType: mapDataType(col.dataType),
    format: col.format,
  }));
}

function mapDataType(cdiscType: string): "string" | "integer" | "float" | "date" | "datetime" | "boolean" | "null" {
  switch (cdiscType.toLowerCase()) {
    case "decimal":
    case "float":
      return "float";
    case "int":
    case "integer":
      return "integer";
    case "date":
      return "date";
    case "datetime":
      return "datetime";
    case "boolean":
      return "boolean";
    default:
      return "string";
  }
}
