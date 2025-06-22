import { DataProvider, SpreadsheetOptions } from "./types";
import { formatCellValue } from "./SpreadsheetVisualizer";

interface MenuItem {
  label: string;
  action: () => void;
}

export class ContextMenu {
  private contextMenu: HTMLElement;
  private menuItems: MenuItem[];
  private dataProvider: DataProvider;
  private options: SpreadsheetOptions;
  private getSelectedCells: () => { startRow: number; endRow: number; startCol: number; endCol: number } | null;

  constructor(
    dataProvider: DataProvider,
    options: SpreadsheetOptions,
    getSelectedCells: () => { startRow: number; endRow: number; startCol: number; endCol: number } | null
  ) {
    this.dataProvider = dataProvider;
    this.options = options;
    this.getSelectedCells = getSelectedCells;

    this.contextMenu = document.createElement("div");
    this.contextMenu.id = "spreadsheet-context-menu";
    this.contextMenu.style.cssText = `
      position: fixed;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      padding: 4px 0;
      z-index: 10000;
      display: none;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      min-width: 150px;
    `;

    this.menuItems = [
      { label: "Export as CSV", action: () => this.exportAsCSV() },
      { label: "Export as TSV", action: () => this.exportAsTSV() },
      { label: "Export as HTML", action: () => this.exportAsHTML() },
      { label: "Export as Markdown", action: () => this.exportAsMarkdown() },
    ];

    this.menuItems.forEach((item) => {
      const menuItem = document.createElement("div");
      menuItem.style.cssText = `
        padding: 8px 16px;
        cursor: pointer;
        transition: background-color 0.1s;
      `;
      menuItem.textContent = item.label;

      menuItem.addEventListener("mouseenter", () => {
        menuItem.style.backgroundColor = "#f5f5f5";
      });

      menuItem.addEventListener("mouseleave", () => {
        menuItem.style.backgroundColor = "transparent";
      });

      menuItem.addEventListener("click", () => {
        item.action();
        this.hide();
      });

      this.contextMenu!.appendChild(menuItem);
    });

    document.body.appendChild(this.contextMenu);
  }

  public async show(event: MouseEvent) {
    event.stopPropagation();
    event.preventDefault();

    const selectedCells = this.getSelectedCells();

    // Only show context menu if there are selected cells
    if (!selectedCells) return;

    // Show context menu at mouse position
    if (this.contextMenu) {
      const menuWidth = 150; // Approximate menu width
      const menuHeight = 120; // Approximate menu height

      // Calculate position to keep menu within viewport
      let left = event.clientX;
      let top = event.clientY;

      if (left + menuWidth > window.innerWidth) {
        left = window.innerWidth - menuWidth - 10;
      }

      if (top + menuHeight > window.innerHeight) {
        top = window.innerHeight - menuHeight - 10;
      }

      this.contextMenu.style.left = `${left}px`;
      this.contextMenu.style.top = `${top}px`;
      this.contextMenu.style.display = "block";
    }
  }

  public hide() {
    if (this.contextMenu) {
      this.contextMenu.style.display = "none";
    }
  }

  private async exportAsText(separator: string) {
    const selectedCells = this.getSelectedCells();

    if (!selectedCells) return;

    const { startRow, endRow, startCol, endCol } = selectedCells;
    const columns = await this.dataProvider.getColumns();
    const data = await this.dataProvider.fetchData(
      Math.min(startRow, endRow),
      Math.max(startRow, endRow),
      Math.min(startCol, endCol),
      Math.max(startCol, endCol)
    );

    // Get column headers for the selected range
    const headers = [];
    for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
      headers.push(columns[col].header);
    }

    // Create CSV content with headers
    const csvContent = [
      headers.join(separator),
      ...data.map((row) =>
        row
          .map((cell) => {
            const value = formatCellValue(cell, this.options);
            // Escape quotes and wrap in quotes if contains comma, quote, or newline
            if (value.includes(separator) || value.includes('"') || value.includes("\n")) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(separator)
      ),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(csvContent);
    } catch (err) {
      console.error("Failed to copy CSV to clipboard:", err);
    }
  }

  public async exportAsCSV() {
    await this.exportAsText(",");
  }

  public async exportAsTSV() {
    await this.exportAsText("\t");
  }

  public async exportAsHTML() {
    const selectedCells = this.getSelectedCells();

    if (!selectedCells) return;

    const { startRow, endRow, startCol, endCol } = selectedCells;
    const columns = await this.dataProvider.getColumns();
    const data = await this.dataProvider.fetchData(
      Math.min(startRow, endRow),
      Math.max(startRow, endRow),
      Math.min(startCol, endCol),
      Math.max(startCol, endCol)
    );

    // Get column headers for the selected range
    const headers = [];
    for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
      headers.push(columns[col].header);
    }

    // Create HTML table
    const htmlContent = `
<table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse; font-family: Arial, sans-serif;">
  <thead>
    <tr>
      ${headers.map((header) => `<th style="background-color: #f2f2f2; padding: 8px; text-align: left;">${header}</th>`).join("")}
    </tr>
  </thead>
  <tbody>
    ${data
      .map((row) => `<tr>${row.map((cell) => `<td style="padding: 8px;">${formatCellValue(cell, this.options)}</td>`).join("")}</tr>`)
      .join("")}
  </tbody>
</table>`;

    try {
      await navigator.clipboard.writeText(htmlContent);
    } catch (err) {
      console.error("Failed to copy HTML to clipboard:", err);
    }
  }

  public async exportAsMarkdown() {
    const selectedCells = this.getSelectedCells();

    if (!selectedCells) return;

    const { startRow, endRow, startCol, endCol } = selectedCells;
    const columns = await this.dataProvider.getColumns();

    const data = await this.dataProvider.fetchData(
      Math.min(startRow, endRow),
      Math.max(startRow, endRow),
      Math.min(startCol, endCol),
      Math.max(startCol, endCol)
    );

    // Get column headers for the selected range
    const headers = [];
    for (let col = Math.min(startCol, endCol); col <= Math.max(startCol, endCol); col++) {
      headers.push(columns[col].header);
    }

    // Create markdown table
    const markdownContent = [
      `| ${headers.join(" | ")} |`,
      `| ${headers.map(() => "---").join(" | ")} |`,
      ...data.map((row) => `| ${row.map((cell) => formatCellValue(cell, this.options)).join(" | ")} |`),
    ].join("\n");

    try {
      await navigator.clipboard.writeText(markdownContent);
    } catch (err) {
      console.error("Failed to copy Markdown to clipboard:", err);
    }
  }

  public destroy() {
    // Clean up context menu
    if (this.contextMenu && this.contextMenu.parentNode) {
      this.contextMenu.parentNode.removeChild(this.contextMenu);
    }

    // Remove event listeners
    document.removeEventListener("click", () => this.hide());
  }
}
