import { SpreadsheetVisualizer, Column, DataProvider } from './SpreadsheetVisualizer';

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
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return this.data.slice(startRow, endRow).map(row => 
      row.slice(startCol, endCol + 1)
    );
  }

  async getTotalRows(): Promise<number> {
    return this.totalRows;
  }

  async getTotalColumns(): Promise<number> {
    return this.totalColumns;
  }
}

// Example columns
const columns: Column[] = [
  { header: "String", key: "string", dataType: "string" },
  { header: "Number", key: "number", dataType: "decimal", format: '{"minimumFractionDigits": 2, "maximumFractionDigits": 2}' },
  { header: "Date", key: "date", dataType: "date", format: 'yyyy-MM-dd' },
  { header: "Boolean", key: "boolean", dataType: "boolean" },
  { header: "String 2", key: "string2", dataType: "string" },
  { header: "Number 2", key: "number2", dataType: "decimal" },
  { header: "Date 2", key: "date2", dataType: "datetime" },
  { header: "Boolean 2", key: "boolean2", dataType: "boolean" },
  { header: "String 3", key: "string3", dataType: "string" },
  { header: "Number 3", key: "number3", dataType: "decimal" }
];

// Initialize the spreadsheet
async function initSpreadsheet() {
  const container = document.getElementById('spreadsheet-container');
  if (!container) return;

  const canvas = document.createElement('canvas');
  container.appendChild(canvas);

  const dataProvider = new ExampleDataProvider();
  
  new SpreadsheetVisualizer(canvas, columns, dataProvider, {
    // Viewport options
    maxHeight: 800,
    maxWidth: 1200,
    minHeight: 400,
    minWidth: 600,
    
    // Format options
    dateFormat: 'yyyy-MM-dd',
    datetimeFormat: 'yyyy-MM-dd HH:mm:ss',
    numberFormat: { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  });
}

// Start the application
initSpreadsheet().catch(console.error); 