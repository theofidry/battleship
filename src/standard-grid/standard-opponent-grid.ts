import { Coordinate } from '../grid/coordinate';
import { OpponentGrid } from '../grid/opponent-grid';
import { StdColumnIndex } from './std-column-index';
import { StdRowIndex } from './std-row-index';

export class StandardOpponentGrid implements OpponentGrid<StdColumnIndex, StdRowIndex> {

    markAsMissed(coordinate: Coordinate<StdColumnIndex, StdRowIndex>): void {
        // TODO
    }

    markAsHit(coordinate: Coordinate<StdColumnIndex, StdRowIndex>): void {
        // TODO

    }

    markAsSunk(coordinate: Coordinate<StdColumnIndex, StdRowIndex>): void {
        // TODO
    }
}
