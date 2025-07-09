export interface Command {
  id: string;
  title: string;
  description?: string;
  category?: string;
  keybinding?: string;
  icon?: string;
  when?: () => boolean;
  execute: () => void | Promise<void>;
}

export class CommandPalette {
  private container!: HTMLElement;
  private overlay!: HTMLElement;
  private input!: HTMLInputElement;
  private commandList!: HTMLElement;
  private commands: Map<string, Command> = new Map();
  private filteredCommands: Command[] = [];
  private selectedIndex: number = 0;
  private isVisible: boolean = false;
  private onHideCallback?: () => void;

  constructor(parent: HTMLElement) {
    this.createElements();
    parent.appendChild(this.container);
    this.setupEventListeners();
    this.registerDefaultCommands();
  }

  private createElements(): void {
    // Overlay
    this.overlay = document.createElement("div");
    this.overlay.className = "command-palette-overlay";
    this.overlay.addEventListener("click", () => this.hide());

    // Container
    this.container = document.createElement("div");
    this.container.className = "command-palette";
    this.container.style.display = "none";

    // Input
    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.className = "command-palette__input";
    this.input.placeholder = "Type a command...";
    this.input.addEventListener("input", () => this.filterCommands());
    this.input.addEventListener("keydown", (e) => this.handleKeyDown(e));

    // Command list
    this.commandList = document.createElement("div");
    this.commandList.className = "command-palette__list";

    this.container.appendChild(this.overlay);
    this.container.appendChild(this.input);
    this.container.appendChild(this.commandList);
  }

  private setupEventListeners(): void {
    // Global keyboard shortcut
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        this.toggle();
      } else if (e.key === "Escape" && this.isVisible) {
        this.hide();
      }
    });
  }

  public registerCommand(command: Command): void {
    this.commands.set(command.id, command);
    if (this.isVisible) {
      this.filterCommands();
    }
  }

  public unregisterCommand(id: string): void {
    this.commands.delete(id);
    if (this.isVisible) {
      this.filterCommands();
    }
  }

  public show(): void {
    this.isVisible = true;
    this.container.style.display = "block";
    this.input.value = "";
    this.input.focus();
    this.filterCommands();
    this.selectedIndex = 0;
    this.updateSelection();
  }

  public hide(): void {
    this.isVisible = false;
    this.container.style.display = "none";
    this.input.blur();
    if (this.onHideCallback) {
      this.onHideCallback();
    }
  }

  public toggle(): void {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  public setOnHideCallback(callback: () => void): void {
    this.onHideCallback = callback;
  }

  private filterCommands(): void {
    const query = this.input.value.toLowerCase();
    this.filteredCommands = Array.from(this.commands.values())
      .filter((command) => {
        // Check if command should be shown (when condition)
        if (command.when && !command.when()) {
          return false;
        }

        // Filter by search query
        if (query === "") {
          return true;
        }

        return (
          command.title.toLowerCase().includes(query) ||
          command.description?.toLowerCase().includes(query) ||
          command.category?.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        // Sort by relevance (title matches first, then description, then category)
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        if (aTitle.startsWith(query) && !bTitle.startsWith(query)) return -1;
        if (!aTitle.startsWith(query) && bTitle.startsWith(query)) return 1;
        if (aTitle.includes(query) && !bTitle.includes(query)) return -1;
        if (!aTitle.includes(query) && bTitle.includes(query)) return 1;

        return a.title.localeCompare(b.title);
      });

    this.renderCommands();
    this.selectedIndex = 0;
    this.updateSelection();
  }

  private renderCommands(): void {
    this.commandList.innerHTML = "";

    if (this.filteredCommands.length === 0) {
      const noResults = document.createElement("div");
      noResults.className = "command-palette__no-results";
      noResults.textContent = "No commands found";
      this.commandList.appendChild(noResults);
      return;
    }

    this.filteredCommands.forEach((command) => {
      const item = document.createElement("div");
      item.className = "command-palette__item";
      item.addEventListener("click", () => this.executeCommand(command));

      const titleElement = document.createElement("div");
      titleElement.className = "command-palette__item-title";
      titleElement.textContent = command.title;

      const detailsElement = document.createElement("div");
      detailsElement.className = "command-palette__item-details";

      if (command.description) {
        const descElement = document.createElement("span");
        descElement.className = "command-palette__item-description";
        descElement.textContent = command.description;
        detailsElement.appendChild(descElement);
      }

      if (command.keybinding) {
        const keybindingElement = document.createElement("span");
        keybindingElement.className = "command-palette__item-keybinding";
        keybindingElement.textContent = command.keybinding;
        detailsElement.appendChild(keybindingElement);
      }

      item.appendChild(titleElement);
      if (detailsElement.hasChildNodes()) {
        item.appendChild(detailsElement);
      }

      this.commandList.appendChild(item);
    });
  }

  private handleKeyDown(e: KeyboardEvent): void {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredCommands.length - 1);
        this.updateSelection();
        break;
      case "ArrowUp":
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        break;
      case "Enter":
        e.preventDefault();
        if (this.filteredCommands[this.selectedIndex]) {
          this.executeCommand(this.filteredCommands[this.selectedIndex]);
        }
        break;
      case "Escape":
        this.hide();
        break;
    }
  }

  private updateSelection(): void {
    const items = this.commandList.querySelectorAll(".command-palette__item");
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        item.classList.add("command-palette__item--selected");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.classList.remove("command-palette__item--selected");
      }
    });
  }

  private async executeCommand(command: Command): Promise<void> {
    try {
      await command.execute();
      this.hide();
    } catch (error) {
      console.error("Error executing command:", error);
    }
  }

  private registerDefaultCommands(): void {
    this.registerCommand({
      id: "workbench.action.showCommands",
      title: "Show All Commands",
      description: "Show command palette",
      category: "View",
      keybinding: "Ctrl+P",
      execute: () => {
        // This command shows the palette itself, so we don't need to do anything
      },
    });

    this.registerCommand({
      id: "workbench.action.reload",
      title: "Reload Window",
      description: "Reload the current window",
      category: "Developer",
      keybinding: "Ctrl+R",
      execute: () => {
        window.location.reload();
      },
    });

    this.registerCommand({
      id: "workbench.action.toggleFullScreen",
      title: "Toggle Full Screen",
      description: "Toggle full screen mode",
      category: "View",
      keybinding: "F11",
      execute: () => {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      },
    });
  }

  public destroy(): void {
    this.container.remove();
  }
}
