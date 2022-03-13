import { bold } from 'chalk';
import { Map } from 'immutable';
import { values } from 'lodash';
import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { isNotUndefined } from '../../assert/assert-is-not-undefined';
import { HitResponse } from '../../communication/hit-response';
import { Coordinate } from '../../grid/coordinate';
import { OpponentGrid } from '../../grid/opponent-grid';
import { HitStrategy, PreviousMove } from '../../player/hit-strategy';
import { Cell } from '../standard-opponent-grid';
import { getNextColumnIndex, getPreviousColumnIndex, StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { getNextRowIndex, getPreviousRowIndex, StdRowIndex } from '../std-row-index';
import assert = require('node:assert');

export class SmartHitStrategy implements HitStrategy<StdColumnIndex, StdRowIndex, Cell> {
    decide(
        grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>,
        previousMove: PreviousMove<StdColumnIndex, StdRowIndex> | undefined,
    ): Observable<StdCoordinate> {
        const availableCoordinates = collectUntouchedCoordinates(grid)
            .filter(restrictChoiceBasedOnPreviousMove(previousMove));

        return of(
            createSelectRandomCoordinate(availableCoordinates.valueSeq().toArray()),
        );
    }
}

function collectUntouchedCoordinates(grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>): Map<string, StdCoordinate> {
    return Map(
        grid
            .getRows()
            .toArray()
            .flatMap(
                ([rowIndex, row]) => row
                    .toArray()
                    .filter(([_columnIndex, cell]) => cell === Cell.NONE)
                    .map(([columnIndex]) => new Coordinate(columnIndex, rowIndex)),
            )
            .map((coordinate) => [coordinate.toString(), coordinate]),
    );
}

function restrictChoiceBasedOnPreviousMove(
    previousMove: PreviousMove<StdColumnIndex, StdRowIndex> | undefined
): (value: StdCoordinate, key: string)=> boolean {
    if (undefined === previousMove) {
        return () => true;
    }

    const { target: previousTarget, response: previousResponse } = previousMove;

    if (HitResponse.HIT !== previousResponse) {
        return () => true;
    }

    const potentialTargets = getCoordinatesAroundTarget(previousTarget)
        .map((potentialTarget) => potentialTarget.toString());

    return (coordinate, key) => potentialTargets.includes(key);
}

function getCoordinatesAroundTarget(previousTarget: StdCoordinate): Array<StdCoordinate> {
    const targetColumnIndex = previousTarget.columnIndex;
    const targetRowIndex = previousTarget.rowIndex;

    const potentialColumnIndices = [
        getPreviousColumnIndex(targetColumnIndex),
        getNextColumnIndex(targetColumnIndex),
    ].filter(isNotUndefined);

    const potentialRowIndices = [
        getPreviousRowIndex(targetRowIndex),
        getNextRowIndex(targetRowIndex),
    ].filter(isNotUndefined);

    return [
        ...potentialColumnIndices.map(
            (columnIndex) => new Coordinate(columnIndex, targetRowIndex),
        ),
        ...potentialRowIndices.map(
            (rowIndex) => new Coordinate(targetColumnIndex, rowIndex),
        ),
    ];
}


function createSelectRandomCoordinate(choices: Array<StdCoordinate>): StdCoordinate {
    const value = _.sample(choices);
    assert(undefined !== value);

    return value;
}
