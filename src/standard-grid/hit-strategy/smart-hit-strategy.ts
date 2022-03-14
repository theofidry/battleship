import { List, Map } from 'immutable';
import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { assertIsNotUndefined, isNotUndefined } from '../../assert/assert-is-not-undefined';
import { assertIsUnreachableCase } from '../../assert/assert-is-unreachable';
import { HitResponse } from '../../communication/hit-response';
import { Coordinate } from '../../grid/coordinate';
import { OpponentGrid } from '../../grid/opponent-grid';
import { HitStrategy, PreviousMove } from '../../player/hit-strategy';
import { ShipDirection } from '../../ship/ship-direction';
import { Either } from '../../utils/either';
import { Cell } from '../standard-opponent-grid';
import { getNextColumnIndex, getPreviousColumnIndex, StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { getNextRowIndex, getPreviousRowIndex, StdRowIndex } from '../std-row-index';
import assert = require('node:assert');

// intersect desired with searched (when possible)

export class SmartHitStrategy implements HitStrategy<StdColumnIndex, StdRowIndex, Cell> {
    private previousMoves: List<PreviousMove<StdColumnIndex, StdRowIndex>> = List();
    private previousHits: List<PreviousMove<StdColumnIndex, StdRowIndex>> = List();

    decide(
        grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>,
        previousMove: PreviousMove<StdColumnIndex, StdRowIndex> | undefined,
    ): Observable<StdCoordinate> {
        const availableCoordinates = this.findChoices(grid, previousMove);

        return of(
            createSelectRandomCoordinate(availableCoordinates),
        );
    }

    findChoices(
        grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>,
        previousMove: PreviousMove<StdColumnIndex, StdRowIndex> | undefined,
    ): ReadonlyArray<StdCoordinate> {
        if (undefined !== previousMove) {
            this.previousMoves = this.previousMoves.push(previousMove);

            if (previousMove.response === HitResponse.HIT) {
                this.previousHits = this.previousHits.push(previousMove);
            }
        }

        return collectUntouchedCoordinates(grid)
            .filter(this.restrictChoiceBasedOnPreviousMoves())
            .valueSeq()
            .toArray();
    }

    private restrictChoiceBasedOnPreviousMoves(): (value: StdCoordinate, key: string)=> boolean {
        const lastMove = this.previousHits.last();
        const noFilter = () => true;

        if (undefined === lastMove) {
            return noFilter;
        }

        if (HitResponse.HIT !== lastMove.response) {
            return noFilter;
        }

        if (this.previousHits.size === 1) {
            // The previous target was a hit: we initiate the hit sequence and
            // target the surrounding cells.
            const potentialTargets = getSurroundingCoordinates(lastMove.target)
                .map((potentialTarget) => potentialTarget.toString());

            return (coordinate, key) => potentialTargets.includes(key);
        }

        const potentialTargets = getSurroundingCoordinatesFollowingDirection(
                this.previousHits
                    .map((previousMove) => previousMove.target),
            )
            .map((potentialTarget) => potentialTarget.toString());

        return (coordinate, key) => potentialTargets.includes(key);
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

export function getSurroundingCoordinates(coordinate: StdCoordinate): ReadonlyArray<StdCoordinate> {
    const targetColumnIndex = coordinate.columnIndex;
    const targetRowIndex = coordinate.rowIndex;

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

export function getSurroundingCoordinatesFollowingDirection(coordinates: List<StdCoordinate>): ReadonlyArray<StdCoordinate> {
    assert(coordinates.size >= 2);
    const direction = findDirection(coordinates).getOrThrow(new Error('Expected to find a direction'));

    const first = coordinates.first();
    assertIsNotUndefined(first);

    switch (direction) {
        case ShipDirection.HORIZONTAL:
            return findHeadTail(
                    coordinates.map((coordinate) => coordinate.columnIndex),
                    getPreviousColumnIndex,
                    getNextColumnIndex,
                )
                .map((columnIndex) => new Coordinate(columnIndex, first.rowIndex));

        case ShipDirection.VERTICAL:
            return findHeadTail(
                    coordinates.map((coordinate) => coordinate.rowIndex),
                    getPreviousRowIndex,
                    getNextRowIndex,
                )
                .map((rowIndex) => new Coordinate(first.columnIndex, rowIndex));
    }

    assertIsUnreachableCase(direction);
}

function findDirection(coordinates: List<StdCoordinate>): Either<undefined, ShipDirection> {
    const firstCoordinate = coordinates.first();
    assertIsNotUndefined(firstCoordinate);

    const secondCoordinate = coordinates.get(1);
    assertIsNotUndefined(secondCoordinate);

    const targetColumnIndex = firstCoordinate.columnIndex;
    const targetRowIndex = firstCoordinate.rowIndex;

    const potentialColumnIndices = [
        getPreviousColumnIndex(targetColumnIndex),
        getNextColumnIndex(targetColumnIndex),
    ].filter(isNotUndefined);

    if (potentialColumnIndices.includes(secondCoordinate.columnIndex)) {
        return Either.right(ShipDirection.HORIZONTAL);
    }

    const potentialRowIndices = [
        getPreviousRowIndex(targetRowIndex),
        getNextRowIndex(targetRowIndex),
    ].filter(isNotUndefined);

    if (potentialRowIndices.includes(secondCoordinate.rowIndex)) {
        return Either.right(ShipDirection.VERTICAL);
    }

    return Either.left(undefined);
}

function findHeadTail<Index extends PropertyKey>(
    indices: List<Index>,
    getPreviousIndex: (index: Index)=> Index | undefined,
    getNextIndex: (index: Index)=> Index | undefined,
): ReadonlyArray<Index> {
    const start = indices.first();
    assertIsNotUndefined(start);

    return [
        findNextHead(
            indices,
            getPreviousIndex,
        ),
        findNextHead(
            indices,
            getNextIndex,
        ),
    ].filter(isNotUndefined);
}

function findNextHead<Index extends PropertyKey>(
    indices: List<Index>,
    getNextIndex: (index: Index)=> Index | undefined,
): Index | undefined {
    const start = indices.first();
    assertIsNotUndefined(start);

    let head: Index | undefined;
    let previousHead: Index = start;

    // eslint-disable-next-line no-constant-condition
    while (true) {
        head = getNextIndex(previousHead);

        if (undefined === head) {
            return undefined;
        }

        if (undefined === head || !indices.includes(head)) {
            return head;
        }

        previousHead = head;
    }
}

function createSelectRandomCoordinate(choices: ReadonlyArray<StdCoordinate>): StdCoordinate {
    const value = _.sample(choices);
    assert(undefined !== value);

    return value;
}
