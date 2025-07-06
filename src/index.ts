// Main components
export { MultiDatasetVisualizer } from './components/MultiDatasetVisualizer';
export { DatasetPanel } from './components/DatasetPanel';
export { SpreadsheetVisualizer } from './components/SpreadsheetVisualizer';
export { ColumnStatsVisualizer } from './components/ColumnStatsVisualizer/ColumnStatsVisualizer';

// Data types and utilities
export type { CdiscDataset, CdiscColumn } from './data/types';
export { getColumns } from './data/types';
export { CdiscDataProvider } from './data/providers/CdiscDataProvider';

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