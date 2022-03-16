import { List, Map, Set } from 'immutable';
import { sample, toString } from 'lodash';
import { Observable, of } from 'rxjs';
import { assertIsNotUndefined, isNotUndefined } from '../../assert/assert-is-not-undefined';
import { assertIsUnreachableCase } from '../../assert/assert-is-unreachable';
import { HitResponse } from '../../communication/hit-response';
import { Coordinate } from '../../grid/coordinate';
import { CoordinateAlignment } from '../../grid/coordinate-navigator';
import { printGrid } from '../../grid/grid-printer';
import { OpponentGrid } from '../../grid/opponent-grid';
import { HitStrategy, PreviousMove } from '../../player/hit-strategy';
import { ShipDirection } from '../../ship/ship-direction';
import { Either } from '../../utils/either';
import { Cell } from '../standard-opponent-grid';
import { findNextColumnIndex, findPreviousColumnIndex, StdColumnIndex } from '../std-column-index';
import { StdCoordinate } from '../std-coordinate';
import { StdCoordinateNavigator } from '../std-coordinate-navigator';
import { findNextRowIndex, findPreviousRowIndex, StdRowIndex } from '../std-row-index';
import assert = require('node:assert');

// TODO: make it grid-independent
export class SmartHitStrategy implements HitStrategy<StdColumnIndex, StdRowIndex, Cell> {
    private previousMoves: List<PreviousMove<StdColumnIndex, StdRowIndex>> = List();
    private previousHits: List<Coordinate<StdColumnIndex, StdRowIndex>> = List();

    decide(
        grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>,
        previousMove: PreviousMove<StdColumnIndex, StdRowIndex> | undefined,
    ): Observable<StdCoordinate> {
        const availableCoordinates = this.findChoices(grid, previousMove);

        return of(
            // TODO: double check with the other implementation for code-reuse
            createSelectRandomCoordinate(availableCoordinates),
        );
    }

    findChoices(
        grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>,
        previousMove: PreviousMove<StdColumnIndex, StdRowIndex> | undefined,
    ): ReadonlyArray<StdCoordinate> {
        this.recordPreviousMove(previousMove);

        // TODO: double check with the other implementation for code-reuse
        const untouchedCoordinates = collectUntouchedCoordinates(grid);

        const alignedHitCoordinatesList = StdCoordinateNavigator.findAlignments(
            this.previousHits,
            5,  // TODO: double check this number
        );

        const filters: List<ChoiceStrategy<StdColumnIndex, StdRowIndex>> = List([
                ...this.previousHits.map(
                    (previousHit) => this.createTargetSurroundingCoordinatesFilterStrategy(previousHit),
                ),
                ...alignedHitCoordinatesList.flatMap(
                    (alignedHitCoordinates) => [
                        this.createTargetAlignmentGapsFilterStrategy(alignedHitCoordinates),
                        this.createTargetAlignmentExtremumsFilterStrategy(alignedHitCoordinates),
                    ],
                ),
                // Always keep this one as a fallback as any previous strategy may
                // result in an empty choice
                createNoFilterFilterStrategy(),
            ].filter(isNotUndefined)
        );

        const applyStrategyMapper = createApplyStrategyMapper(untouchedCoordinates);

        const choicesList = filters
            .map(applyStrategyMapper)
            .filter(({ coordinates }) => coordinates.size !== 0)
            .sort(sortByLengthAscendingOrder);

        const choices = choicesList
            .first()!
            .coordinates
            .valueSeq()
            .toArray();

        this.assertThereIsAChoiceLeft(choicesList, untouchedCoordinates, grid);

        return choices;
    }

    private recordPreviousMove(previousMove: PreviousMove<StdColumnIndex, StdRowIndex> | undefined): void {
        if (undefined === previousMove) {
            return;
        }

        this.previousMoves = this.previousMoves.push(previousMove);

        if (previousMove.response === HitResponse.HIT) {
            this.previousHits = this.previousHits.push(previousMove.target);
        }

        if (previousMove.response === HitResponse.SUNK) {
            this.previousHits = List();
        }
    }

    private createTargetSurroundingCoordinatesFilterStrategy(
        hitTarget: StdCoordinate,
    ): ChoiceStrategy<StdColumnIndex, StdRowIndex> | undefined {
        // Picks the coordinates surrounding the given hit target.
        const validCandidates = Set(
            StdCoordinateNavigator.getSurroundingCoordinates(hitTarget),
        );

        if (validCandidates.size === 0) {
            return undefined;
        }

        return {
            strategy: `HitTargetSurroundings<${hitTarget.toString()}>`,
            filter: (candidate) => validCandidates.includes(candidate),
        };
    }

    private createTargetAlignmentGapsFilterStrategy(
        alignedHitCoordinates: CoordinateAlignment<StdColumnIndex, StdRowIndex>,
    ): ChoiceStrategy<StdColumnIndex, StdRowIndex> | undefined {
        // Picks the coordinates between aligned hit coordinates.
        const validCandidates = StdCoordinateNavigator.findAlignmentGaps(alignedHitCoordinates);

        if (validCandidates.size === 0) {
            return undefined;
        }

        const directionString = alignedHitCoordinates.direction.toString();
        const alignedCoordinatesString = alignedHitCoordinates.coordinates.map(toString);

        return {
            strategy: `HitAlignedGapsHitTargets<${directionString},${alignedCoordinatesString}>`,
            filter: (candidate) => validCandidates.includes(candidate),
        };
    }

    private createTargetAlignmentExtremumsFilterStrategy(
        alignedHitCoordinates: CoordinateAlignment<StdColumnIndex, StdRowIndex>,
    ): ChoiceStrategy<StdColumnIndex, StdRowIndex> | undefined {
        // Picks the extremums coordinates of aligned hit coordinates.
        const validCandidates = StdCoordinateNavigator.findNextExtremums(alignedHitCoordinates);

        if (validCandidates.size === 0) {
            return undefined;
        }

        const directionString = alignedHitCoordinates.direction.toString();
        const alignedCoordinatesString = alignedHitCoordinates.coordinates.map(toString);

        return {
            strategy: `HitAlignedExtremumsHitTargets<${directionString},${alignedCoordinatesString}>`,
            filter: (candidate) => validCandidates.includes(candidate),
        };
    }

    private assertThereIsAChoiceLeft(
        choicesList: List<AppliedChoiceStrategy<StdColumnIndex, StdRowIndex>>,
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
        // TODO: throw an exception with the right data which then can be properly logged even at runtime
        return;

        // TODO: remove this once we are confident with the implementation of the filters.
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

        const normalizedChoicesStrategies = choicesList
            .map((list) => list.strategy)
            .toArray();

        const normalizedChoicesCoordinates = choicesList
            .map((list) => list
                .coordinates
                .valueSeq()
                .map(toString)
                .toArray()
            )
            .toArray();

        console.log({
            normalizedPreviousMoves,
            normalizedPreviousHits,
            normalizedUntouchedCoordinates,
            normalizedChoicesStrategies,
            normalizedChoicesCoordinates,
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

function createNoFilterFilterStrategy(): ChoiceStrategy<StdColumnIndex, StdRowIndex> {
    return {
        strategy: 'NoFilter',
        filter: () => true,
    };
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

type ChoiceStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    readonly strategy: string,
    filter: (coordinate: Coordinate<ColumnIndex, RowIndex>)=> boolean,
};

type AppliedChoiceStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    readonly strategy: string,
    coordinates: Map<string, Coordinate<ColumnIndex, RowIndex>>,
};

function createApplyStrategyMapper<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    source: Map<string, Coordinate<ColumnIndex, RowIndex>>,
): (choiceStrategy: ChoiceStrategy<ColumnIndex, RowIndex>)=> AppliedChoiceStrategy<ColumnIndex, RowIndex> {
    return ({ strategy, filter }) => ({
        strategy,
        coordinates: source.filter(filter),
    });
}

function sortByLengthAscendingOrder<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(a: AppliedChoiceStrategy<ColumnIndex, RowIndex>, b: AppliedChoiceStrategy<ColumnIndex, RowIndex>): number {
    return a.coordinates.size - b.coordinates.size;
}

function createSelectRandomCoordinate(choices: ReadonlyArray<StdCoordinate>): StdCoordinate {
    const value = sample(choices);
    assert(undefined !== value);

    return value;
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
