import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { Coordinate } from '../../grid/coordinate';
import { OpponentGrid } from '../../grid/opponent-grid';
import { HitStrategy } from '../../player/hit-strategy';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';
import assert = require('node:assert');

export const RandomHitStrategy: HitStrategy<StdColumnIndex, StdRowIndex, Cell> = {
    decide: (grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>): Observable<Coordinate<StdColumnIndex, StdRowIndex>> => {
        const availableCoordinates = grid
            .getRows()
            .toArray()
            .flatMap(
            ([rowIndex, row]) => row
                .toArray()
                .filter(([_columnIndex, cell]) => cell === Cell.NONE)
                .map(([columnIndex]) => new Coordinate(columnIndex, rowIndex)),
        );

        return of(createSelectRandomCoordinate(availableCoordinates));
    },
};
// TODO: introduce StdCoordinate type

function createSelectRandomCoordinate(choices: Array<Coordinate<StdColumnIndex, StdRowIndex>>): Coordinate<StdColumnIndex, StdRowIndex> {
    const value = _.sample(choices);
    assert(undefined !== value);

    return value;
}
