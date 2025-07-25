import { Column, DataProvider, DatasetMetadata } from "../types";

export class DefaultDataProvider implements DataProvider {
  private name: string;
  private totalRows: number;
  private totalColumns: number;
  private columns: Column[];
  private rows: any[][];

  constructor(name: string, totalRows: number, totalColumns: number, columns: Column[], rows: any[][]) {
    this.name = name;
    this.totalRows = totalRows;
    this.totalColumns = totalColumns;
    this.columns = columns;
    this.rows = rows;
  }

  async getMetadata(): Promise<DatasetMetadata> {
    return {
      name: this.name,
      totalRows: this.totalRows,
      totalColumns: this.totalColumns,
      columns: this.columns,
    };
  }

  async fetchData(startRow: number, endRow: number, startCol: number, endCol: number): Promise<any[][]> {
    return this.rows.slice(startRow, endRow + 1).map((row: any[]) => row.slice(startCol, endCol + 1));
  }
}
