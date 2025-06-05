import { Column, DataProvider } from "../../components/SpreadsheetVisualizer/types";
import { CdiscDataset, getColumns } from "../types";

export class CdiscDataProvider implements DataProvider {
  private dataset: CdiscDataset;

  constructor(dataset: CdiscDataset) {
    this.dataset = dataset;
  }

  async fetchData(startRow: number, endRow: number, startCol: number, endCol: number): Promise<any[][]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return this.dataset.rows.slice(startRow, endRow).map((row: any[]) => row.slice(startCol, endCol + 1));
  }

  async getColumns(): Promise<Column[]> {
    return getColumns(this.dataset);
  }

  async getTotalRows(): Promise<number> {
    return this.dataset.rows.length;
  }

  async getTotalColumns(): Promise<number> {
    return this.dataset.columns.length;
  }
}
