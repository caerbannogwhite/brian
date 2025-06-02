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
  return dataset.columns.map(col => ({
    header: col.label,
    key: col.name,
    dataType: mapDataType(col.dataType),
    format: col.format
  }));
}

function mapDataType(cdiscType: string): 'string' | 'number' | 'date' | 'datetime' | 'boolean' | 'null' {
  switch (cdiscType.toLowerCase()) {
    case 'integer':
    case 'decimal':
      return 'number';
    case 'date':
      return 'date';
    case 'datetime':
      return 'datetime';
    case 'boolean':
      return 'boolean';
    default:
      return 'string';
  }
} 