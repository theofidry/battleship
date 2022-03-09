import { Map } from 'immutable';
import { Grid, GridRows, Row } from '../grid/grid';
import { OpponentGrid } from '../grid/opponent-grid';
import { EnumHelper } from '../utils/enum-helper';
import { StdColumnIndex } from './std-column-index';
import { StdCoordinate } from './std-coordinate';
import { StdRowIndex } from './std-row-index';

export enum Cell {
    NONE,
    MISSED,
    HIT,
}

export class StandardOpponentGrid implements OpponentGrid<StdColumnIndex, StdRowIndex, Cell> {
    private innerGrid: Readonly<Grid<StdColumnIndex, StdRowIndex, Cell>> = createEmptyGrid();

    markAsHit(coordinate: StdCoordinate): void {
        this.innerGrid = this.innerGrid.fillCells([coordinate], Cell.HIT);
    }

    markAsMissed(coordinate: StdCoordinate): void {
        this.innerGrid = this.innerGrid.fillCells([coordinate], Cell.MISSED);
    }

    getCell(coordinate: StdCoordinate): Cell {
        return this.innerGrid.getCell(coordinate);
    }

    getRows(): Readonly<GridRows<StdColumnIndex, StdRowIndex, Cell>> {
        return this.innerGrid.getRows();
    }
}


function createEmptyRow(): Row<StdColumnIndex, Cell> {
    return Map(
        EnumHelper
            .getValues(StdColumnIndex)
            .map((columnIndex) => [columnIndex, Cell.NONE]),
    );
}

function createEmptyGrid(): Grid<StdColumnIndex, StdRowIndex, Cell> {
    const rows = Map(
        EnumHelper
            .getValues(StdRowIndex)
            .map((rowIndex) => [rowIndex, createEmptyRow()]),
    );

    return new Grid(rows);
}
