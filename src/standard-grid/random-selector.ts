import * as _ from 'lodash';
import { Coordinate } from '../grid/coordinate';
import { SHIP_DIRECTION_INDICES } from '../ship/ship-direction';
import { COLUMN_INDICES, StdColumnIndex } from './std-column-index';
import { ROWS_INDICES, StdRowIndex } from './std-row-index';
import assert = require('node:assert');

function createSelectRandomIndex<T>(indices: T[]): ()=> T {
    return () => {
        const index = _.sample(indices);
        assert(undefined !== index);

        return index;
    };
}

export const selectRandomColumn = createSelectRandomIndex(COLUMN_INDICES);
export const selectRandomRow = createSelectRandomIndex(ROWS_INDICES);
export const selectRandomDirection = createSelectRandomIndex(SHIP_DIRECTION_INDICES);

export const selectRandomCoordinate = (): Coordinate<StdColumnIndex, StdRowIndex> => new Coordinate(
    selectRandomColumn(),
    selectRandomRow(),
);
