import { DataProvider, SpreadsheetOptions } from "@/index";
import { FocusableComponent } from "../BrianApp/types";
import { SpreadsheetVisualizer } from "./SpreadsheetVisualizer";

export class SpreadsheetVisualizerFocusable extends SpreadsheetVisualizer implements FocusableComponent {
  private _isFocused: boolean = false;

  public readonly componentId: string;
  public readonly canReceiveFocus: boolean = true;
  public readonly focusableElement: HTMLElement;

  constructor(parent: HTMLElement, dataProvider: DataProvider, options: SpreadsheetOptions = {}, componentId: string) {
    super(parent, dataProvider, options);
    this.componentId = componentId;
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

  // Event handler methods that delegate to SpreadsheetVisualizer
  public async handleMouseDown(event: MouseEvent): Promise<boolean> {
    if (!this._isFocused) return false;
    await this._handleMouseDown(event);
    return true;
  }

  public async handleMouseMove(event: MouseEvent): Promise<boolean> {
    if (!this._isFocused) return false;
    await this._handleMouseMove(event);
    return true;
  }

  public async handleMouseUp(event: MouseEvent): Promise<boolean> {
    if (!this._isFocused) return false;
    await this._handleMouseUp(event);
    return true;
  }

  public async handleMouseLeave(event: MouseEvent): Promise<boolean> {
    if (!this._isFocused) return false;
    await this._handleMouseLeave(event);
    return true;
  }

  public async handleWheel(event: WheelEvent): Promise<boolean> {
    if (!this._isFocused) return false;
    await this._handleWheel(event);
    return true;
  }

  public async handleKeyDown(event: KeyboardEvent): Promise<boolean> {
    if (!this._isFocused) return false;
    await this._handleKeyDown(event);
    return true;
  }

  public async handleResize(_: Event): Promise<boolean> {
    await this._handleResize();
    return true;
  }

  public async handleContextMenu(_: MouseEvent): Promise<boolean> {
    if (!this._isFocused) return false;
    // await this._handleContextMenu(event);
    return true;
  }

  // private dispatchEventToSpreadsheet(eventType: string, event: Event): void {
  //   // Since SpreadsheetVisualizer still has its own event listeners set up,
  //   // we can dispatch the event to its container to trigger the handlers
  //   if (
  //     this.canvas &&
  //     (eventType === "mousedown" ||
  //       eventType === "mousemove" ||
  //       eventType === "mouseup" ||
  //       eventType === "mouseleave" ||
  //       eventType === "wheel" ||
  //       eventType === "contextmenu")
  //   ) {
  //     this.canvas.dispatchEvent(new MouseEvent(eventType, event as MouseEvent));
  //   } else if (eventType === "keydown") {
  //     document.dispatchEvent(new KeyboardEvent(eventType, event as KeyboardEvent));
  //   } else if (eventType === "resize") {
  //     window.dispatchEvent(new Event(eventType));
  //   }
  // }
}
