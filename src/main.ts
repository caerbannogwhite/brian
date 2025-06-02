import { datasetDm, getColumns, type CdiscDataset } from "./data.ts";
import { SpreadsheetVisualizer, Column, DataProvider } from "./SpreadsheetVisualizer";

// Example data provider
class ExampleDataProvider implements DataProvider {
  private totalRows = 1000;
  private totalColumns = 10;
  private data: any[][] = [];

  constructor() {
    // Generate some example data
    for (let i = 0; i < this.totalRows; i++) {
      const row: any[] = [];
      for (let j = 0; j < this.totalColumns; j++) {
        switch (j % 4) {
          case 0:
            row.push(`String ${i}-${j}`);
            break;
          case 1:
            row.push(Math.random() * 1000);
            break;
          case 2:
            row.push(new Date(Date.now() - Math.random() * 10000000000));
            break;
          case 3:
            row.push(Math.random() > 0.5);
            break;
        }
      }
      this.data.push(row);
    }
  }

  async fetchData(startRow: number, endRow: number, startCol: number, endCol: number): Promise<any[][]> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    return datasetDm.rows.slice(startRow, endRow).map((row) => row.slice(startCol, endCol + 1));
  }

  async getTotalRows(): Promise<number> {
    return datasetDm.rows.length;
  }

  async getTotalColumns(): Promise<number> {
    return datasetDm.columns.length;
  }
}

// Example columns
const columns: Column[] = getColumns(datasetDm as CdiscDataset);

// Initialize the spreadsheet
async function initSpreadsheet() {
  const container = document.getElementById("spreadsheet-container");
  if (!container) return;

  const canvas = document.createElement("canvas");
  container.appendChild(canvas);

  const dataProvider = new ExampleDataProvider();

  new SpreadsheetVisualizer(canvas, columns, dataProvider, {
    // Viewport options
    maxHeight: 800,
    maxWidth: 1200,
    minHeight: 400,
    minWidth: 600,

    // Format options
    dateFormat: "yyyy-MM-dd",
    datetimeFormat: "yyyy-MM-dd HH:mm:ss",
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  });
}

// Start the application
initSpreadsheet().catch(console.error);
