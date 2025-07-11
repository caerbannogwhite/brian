// Main components
export { BrianApp } from './components/BrianApp';
export { MultiDatasetVisualizer } from './components/MultiDatasetVisualizer';
export { DatasetPanel } from './components/DatasetPanel';
export { SpreadsheetVisualizer } from './components/SpreadsheetVisualizer';
export { ColumnStatsVisualizer } from './components/ColumnStatsVisualizer/ColumnStatsVisualizer';
export { StatusBar } from './components/StatusBar';
export { CommandPalette } from './components/CommandPalette';
export { DragDropZone } from './components/DragDropZone';

// Data types and utilities
export type { CdiscDataset, CdiscColumn } from './data/types';
export { getColumns } from './data/types';
export { CdiscDataProvider } from './data/providers/CdiscDataProvider';

// New component types
export type { BrianAppOptions } from './components/BrianApp';
export type { StatusBarItem } from './components/StatusBar';
export type { Command } from './components/CommandPalette';
export type { DragDropZoneOptions } from './components/DragDropZone';

// File parsing utilities
export { parseFile, isSupportedFileType, getSupportedFileTypes } from './data/fileParser';
export type { ParseOptions, ParseResult } from './data/fileParser';

// SpreadsheetVisualizer types
export type { 
  SpreadsheetOptions, 
  DataProvider, 
  Column, 
  CellPosition,
  DatasetMetadata,
  CellStyle,
  ScrollbarState,
  SelectionState,
  HoverState,
  ScrollState
} from './components/SpreadsheetVisualizer/types';

// Import styles
import './styles/main.scss'; 