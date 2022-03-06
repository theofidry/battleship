import { Map } from 'immutable';
import { Grid, Row } from '../grid/grid';
import { EnumHelper } from '../utils/enum-helper';
import { ColumnIndex } from './column-index';
import { RowIndex } from './row-index';

enum Cell {
    EMPTY,
    FULL,
}

/**
 * Represents a player's grid, i.e. the grid the player owns and on which
 * he/she/they places their fleet.
 */
export class PlayerGrid {
    constructor(
        private readonly innerGrid: Grid<ColumnIndex, RowIndex, Cell> = createEmptyGrid(),
    ) {
    }

    placeShip(): void {
        // TODO
    }

    // recordHit(coordinate: Coordinate): ShotResponse {
    //     return ShotResponse.MISS;
    // }

    // getLines(): Readonly<Lines> {
    //     return this.lines;
    // }
}

export function createEmptyRow(): Row<ColumnIndex, Cell> {
    return Map(
        EnumHelper
            .getValues(ColumnIndex)
            .map((columnIndex) => [columnIndex, Cell.EMPTY]),
    );
}

export function createEmptyGrid(): Grid<ColumnIndex, RowIndex, Cell> {
    const rows = Map(
        EnumHelper
            .getValues(RowIndex)
            .map((rowIndex) => [rowIndex, createEmptyRow()]),
    );

    return new Grid(rows);
}
