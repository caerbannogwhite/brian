import { FocusableComponent } from "../BrianApp/types";
import { DragDropZone } from "./DragDropZone";

export class DragDropZoneFocusable extends DragDropZone implements FocusableComponent {
  private _isFocused: boolean = false;

  public readonly componentId: string = "drag-drop-zone";
  public readonly canReceiveFocus: boolean = true;
  public readonly focusableElement: HTMLElement;

  constructor(parent: HTMLElement) {
    super(parent);
    this.focusableElement = this.getContainer();
    this._isFocused = false;
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

  // Event handler methods for drag and drop
  public async handleDragEnter(_event: DragEvent): Promise<boolean> {
    if (!this.isFocused()) return false;
    // DragDropZone handles drag events internally through its own listeners
    // We just need to ensure the zone is focused to receive the events
    return true;
  }

  public async handleDragOver(event: DragEvent): Promise<boolean> {
    if (!this.isFocused()) return false;
    event.preventDefault();
    return true;
  }

  public async handleDragLeave(_event: DragEvent): Promise<boolean> {
    if (!this.isFocused()) return false;
    return true;
  }

  public async handleDrop(event: DragEvent): Promise<boolean> {
    if (!this.isFocused()) return false;
    event.preventDefault();
    return true;
  }
}
