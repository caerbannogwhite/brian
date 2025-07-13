import { FocusableComponent } from "../BrianApp/types";
import { CommandPalette } from "./CommandPalette";

export class CommandPaletteFocusable extends CommandPalette implements FocusableComponent {
  private _isFocused: boolean = false;

  public readonly componentId: string = "command-palette";
  public readonly canReceiveFocus: boolean = true;
  public readonly focusableElement: HTMLElement;

  constructor(parent: HTMLElement) {
    super(parent);
    this.focusableElement = this.getContainer();
  }

  // FocusableComponent interface methods
  public focus(): void {
    this._isFocused = true;
    this.focusableElement.focus();
  }

  public blur(): void {
    this._isFocused = false;
    this.focusableElement.blur();
  }

  public isFocused(): boolean {
    return this._isFocused;
  }

  // Event handler methods
  public async handleKeyDown(event: KeyboardEvent): Promise<boolean> {
    // Handle Ctrl+P for showing command palette
    if (event.ctrlKey && event.key === "p") {
      event.preventDefault();
      this.toggle();
      return true;
    }

    // Handle Escape for hiding command palette
    if (event.key === "Escape" && this.isVisibleState()) {
      this.hide();
      return true;
    }

    return false;
  }

  public async handleResize(_: Event): Promise<boolean> {
    return true;
  }
}
