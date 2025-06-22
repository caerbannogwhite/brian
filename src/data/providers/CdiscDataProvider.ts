import { Column, DataProvider, DatasetMetadata } from "../../components/SpreadsheetVisualizer/types";
import { CdiscDataset, getColumns } from "../types";

export class CdiscDataProvider implements DataProvider {
  private dataset: CdiscDataset;

  constructor(dataset: CdiscDataset) {
    this.dataset = dataset;
  }

  async getMetadata(): Promise<DatasetMetadata> {
    return {
      name: this.dataset.name,
      // description: this.dataset.description,
      totalRows: this.dataset.rows.length,
      totalColumns: this.dataset.columns.length,
      columns: getColumns(this.dataset),
    };
  }

  async fetchData(startRow: number, endRow: number, startCol: number, endCol: number): Promise<any[][]> {
    // Simulate network delay
    const randomDelay = Math.random() * 10;
    await new Promise((resolve) => setTimeout(resolve, 100 - randomDelay));

    return this.dataset.rows.slice(startRow, endRow + 1).map((row: any[]) => row.slice(startCol, endCol + 1));
  }
}
