import { datasetDm, type CdiscDataset } from "./data.ts";
import { getColumns } from "./data.ts";
import type { Column } from "./SpreadsheetVisualizer.ts";
import { SpreadsheetVisualizer } from "./SpreadsheetVisualizer.ts";

// Initialize the visualizer when the page loads
document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");
  if (app) {
    app.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        height: 100vh;
        padding: 20px;
        box-sizing: border-box;
        background-color: #f5f5f5;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <h1 style="margin: 0 0 20px 0;">Spreadsheet Visualizer</h1>
        <div style="
          flex: 1;
          background: white;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          overflow: hidden;
        ">
          <canvas id="spreadsheet" style="
            width: 100%;
            height: 100%;
            display: block;
          "></canvas>
        </div>
      </div>
    `;

    const columns: Column[] = getColumns(datasetDm as CdiscDataset);

    const dataProvider = {
      fetchData: async (startRow: number, endRow: number, startColumn: number, endColumn: number) => {
        return datasetDm.rows.slice(startRow, endRow).map((row) => row.slice(startColumn, endColumn));
      },
      getTotalRows: async () => datasetDm.rows.length,
      getTotalColumns: async () => datasetDm.columns.length,
    };

    const canvas = document.getElementById("spreadsheet") as HTMLCanvasElement;
    const visualizer = new SpreadsheetVisualizer(canvas, columns, dataProvider, {
      cellHeight: 35,
      headerHeight: 45,
      defaultCellStyle: {
        backgroundColor: "#ffffff",
        textColor: "#333333",
        fontSize: 14,
        fontFamily: "Arial",
        textAlign: "left",
        padding: 10,
      },
      headerStyle: {
        backgroundColor: "#f8f9fa",
        textColor: "#495057",
        fontSize: 14,
        fontFamily: "Arial",
        textAlign: "center",
        padding: 10,
      },
      borderColor: "#dee2e6",
      borderWidth: 1,
    });
  }
});
