import { Coordinate } from '../grid/coordinate';
import { STD_COLUMN_INDICES, StdColumnIndex } from './std-column-index';
import { STD_ROW_INDICES, StdRowIndex } from './std-row-index';

export type StdCoordinate = Coordinate<StdColumnIndex, StdRowIndex>;

export const MAX_TURN = STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2;
