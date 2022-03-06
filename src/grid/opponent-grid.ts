import { Coordinate } from '../grid/coordinate';

/**
 * Represents a player's opponent grid, i.e. the grid the player owns and on
 * which he/she/they place a colored peg to track the hits.
 */
export interface OpponentGrid<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {

    markAsMissed(coordinate: Coordinate<ColumnIndex, RowIndex>): void;

    markAsHit(coordinate: Coordinate<ColumnIndex, RowIndex>): void;

    markAsSunk(coordinate: Coordinate<ColumnIndex, RowIndex>): void;
}
