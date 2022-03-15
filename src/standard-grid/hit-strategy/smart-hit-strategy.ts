import { List, Map } from 'immutable';
import { sample, toString } from 'lodash';
import { Observable, of } from 'rxjs';
import { assertIsNotUndefined, isNotUndefined } from '../../assert/assert-is-not-undefined';
import { assertIsUnreachableCase } from '../../assert/assert-is-unreachable';
import { HitResponse } from '../../communication/hit-response';
import { Coordinate } from '../../grid/coordinate';
import { printGrid } from '../../grid/grid-printer';
import { OpponentGrid } from '../../grid/opponent-grid';
import { HitStrategy, PreviousMove } from '../../player/hit-strategy';
import { ShipDirection } from '../../ship/ship-direction';
import { Either } from '../../utils/either';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { StdRowIndex } from '../std-row-index';
import assert = require('node:assert');

export class SmartHitStrategy implements HitStrategy<StdColumnIndex, StdRowIndex, Cell> {
    private previousMoves: List<PreviousMove<StdColumnIndex, StdRowIndex>> = List();
    private previousHits: List<Coordinate<StdColumnIndex, StdRowIndex>> = List();

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
                this.previousHits = this.previousHits.push(previousMove.target);
            }

            if (previousMove.response === HitResponse.SUNK) {
                this.previousHits = List();
            }
        }

        const untouchedCoordinates = collectUntouchedCoordinates(grid);

        const choicesList = List([
                ...this.previousHits.map(
                    (previousHit) => this.createTargetSurroundingCoordinatesFilter(previousHit),
                ),
                this.createTargetFollowingDirectionFilter(),
                createNoFilterFilter(),
            ])
            .map((filter) => untouchedCoordinates.filter(filter))
            .filter((choices) => choices.size !== 0)
            .sort(sortByLengthAscendingOrder);

        const choices = choicesList
            .first()!
            .valueSeq()
            .toArray();

        this.assertThereIsAChoiceLeft(choicesList, untouchedCoordinates, grid);

        return choices;
    }

    private createTargetSurroundingCoordinatesFilter(lastHit: StdCoordinate): (value: StdCoordinate, key: string)=> boolean {
        // The previous target was a hit: we initiate the hit sequence and
        // target the surrounding cells.
        const potentialTargets = getSurroundingCoordinates(lastHit)
            .map((potentialTarget) => potentialTarget.toString());

        return (coordinate, key) => potentialTargets.includes(key);
    }

    private createTargetFollowingDirectionFilter(): (value: StdCoordinate, key: string)=> boolean {
        const lastHit = this.previousHits.last();

        if (undefined === lastHit) {
            return createNoFilterFilter();
        }

        const potentialTargets = getSurroundingCoordinatesFollowingDirection(this.previousHits)
            .map((potentialTarget) => potentialTarget.toString());

        return (coordinate, key) => potentialTargets.includes(key);
    }

    private assertThereIsAChoiceLeft(
        choicesList: List<Map<string, StdCoordinate>>,
        untouchedCoordinates: Map<string, StdCoordinate>,
        grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>,
    ): void {
        if (choicesList.size > 1) {
            return;
        }

        // This is for now an expected case. For example consider the following
        // scenario:
        //     E  F  G  H
        //  6
        //  7  .  x  x
        //  8     x  x  .
        //  9     x  x  .
        // 10     .  x  .
        //
        // With the move orders:
        // F7, F8, G7, F9 (sunk), ..., G10, G9, G8, error!
        // The error case (scenario we are in) happens because G7 which was hit
        // before has been cleared with the previous sunk hence the algorithm
        // gets there and "forgot" G7 was a previous hit and hence that G6 is
        // a logical follow up.
        return;

        // Something went wrong: the following is purely for debugging purposes.
        const normalizedPreviousMoves = this.previousMoves
            .map(({ target, response }) => ({
                target: target.toString(),
                response,
            }))
            .toArray();


        const normalizedPreviousHits = this.previousHits
            .map(toString)
            .toArray();

        const normalizedUntouchedCoordinates = untouchedCoordinates
            .keySeq()
            .toArray();

        const normalizedChoicesList = choicesList
            .map((list) => list
                .valueSeq()
                .map(toString)
                .toArray()
            )
            .toArray();

        console.log({
            normalizedPreviousMoves,
            normalizedPreviousHits,
            normalizedUntouchedCoordinates,
            normalizedChoicesList,
        });

        console.log(
            printGrid(
                grid.getRows(),
                printCell,
            ),
        );

        throw new Error('No choice left!');
    }
}

function createNoFilterFilter(): (value: any)=> boolean {
    return () => true;
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
    if (coordinates.size < 2) {
        return [];
    }

    let direction: ShipDirection;

    try {
        direction = findDirection(coordinates).getOrThrow(new Error('Expected to find a direction'));
    } catch (error) {
        return [];
    }

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

        if (!indices.includes(head)) {
            return head;
        }

        previousHead = head;
    }
}

function createSelectRandomCoordinate(choices: ReadonlyArray<StdCoordinate>): StdCoordinate {
    const value = sample(choices);
    assert(undefined !== value);

    return value;
}

type ImmutableCollection = List<any> | Map<any, any>;

function sortByLengthAscendingOrder(a: ImmutableCollection, b: ImmutableCollection): number {
    return a.size - b.size;
}

function printCell(cell: Cell): string {
    switch (cell) {
        case Cell.NONE:
            return ' ';

        case Cell.HIT:
            return 'x';

        case Cell.MISSED:
            return '.';
    }

    assertIsUnreachableCase(cell);
}
