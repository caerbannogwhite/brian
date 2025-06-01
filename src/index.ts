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

    // Sample data and initialization
    const columns: Column[] = [
      { header: "ID", key: "id", width: 80, type: "number" },
      { header: "Name", key: "name", width: 150, type: "string" },
      { header: "Age", key: "age", width: 80, type: "number" },
      { header: "Email", key: "email", width: 200, type: "string" },
      { header: "Status", key: "status", width: 100, type: "string" },
    ];

    const data: any[] = [
      { id: 1, name: "John Doe", age: 30, email: "john@example.com", status: "Active" },
      { id: 2, name: "Jane Smith", age: 25, email: "jane@example.com", status: "Inactive" },
      { id: 3, name: "Bob Johnson", age: 35, email: "bob@example.com", status: "Active" },
      { id: 4, name: "Alice Brown", age: 28, email: "alice@example.com", status: "Pending" },
      { id: 5, name: "Charlie Wilson", age: 32, email: "charlie@example.com", status: "Active" },
      { id: 6, name: "Massimo M", age: 31, email: "massimo@example.com", status: "Active" },
    ];

    const canvas = document.getElementById("spreadsheet") as HTMLCanvasElement;
    const visualizer = new SpreadsheetVisualizer(canvas, columns, data, {
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
