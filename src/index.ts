// Main components
export { BrianApp } from './components/BrianApp';
export { MultiDatasetVisualizer } from './components/MultiDatasetVisualizer';
export { DatasetPanel } from './components/DatasetPanel';
export { SpreadsheetVisualizer } from './components/SpreadsheetVisualizer';
export { ColumnStatsVisualizer } from './components/ColumnStatsVisualizer/ColumnStatsVisualizer';
export { StatusBar } from './components/StatusBar';
export { CommandPalette } from './components/CommandPalette';

// Data types and utilities
export type { CdiscDataset, CdiscColumn } from './data/types';
export { getColumns } from './data/types';
export { CdiscDataProvider } from './data/providers/CdiscDataProvider';

// New component types
export type { BrianAppOptions } from './components/BrianApp';
export type { StatusBarItem } from './components/StatusBar';
export type { Command } from './components/CommandPalette';

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