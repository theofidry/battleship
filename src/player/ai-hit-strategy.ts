import { List, Map, Set } from 'immutable';
import { sample, toString } from 'lodash';
import { Observable, of } from 'rxjs';
import { assertIsNotUndefined, isNotUndefined } from '../assert/assert-is-not-undefined';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { CoordinateAlignment, CoordinateNavigator } from '../grid/coordinate-navigator';
import { OpponentGrid } from '../grid/opponent-grid';
import { Either } from '../utils/either';
import { HitStrategy, PreviousMove } from './hit-strategy';

export type UntouchedCoordinatesFinder<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentCell,
> = (grid: OpponentGrid<ColumnIndex, RowIndex, OpponentCell>)=> Map<string, Coordinate<ColumnIndex, RowIndex>>;

export type AIErrorHandler<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentCell,
> = (error: InvalidAIStrategy<ColumnIndex, RowIndex, OpponentCell>)=> never;

export class AIHitStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentCell,
> implements HitStrategy<ColumnIndex, RowIndex, OpponentCell> {
    private previousMoves: List<PreviousMove<ColumnIndex, RowIndex>> = List();
    private previousHits: List<Coordinate<ColumnIndex, RowIndex>> = List();

    constructor(
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly findUntouchedCoordinates: UntouchedCoordinatesFinder<ColumnIndex, RowIndex, OpponentCell>,
        private readonly handleError: AIErrorHandler<ColumnIndex, RowIndex, OpponentCell>,
        private readonly enableSmartTargeting: boolean,
        private readonly enableSmartScreening: boolean,
    ) {
    }

    decide(
        grid: OpponentGrid<ColumnIndex, RowIndex, OpponentCell>,
        previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined,
    ): Observable<Coordinate<ColumnIndex, RowIndex>> {
        const availableCoordinates = this.findChoices(grid, previousMove);

        return availableCoordinates.fold(
            this.handleError,
            (choices) => ofRandomCoordinate(
                choices,
                this.coordinateNavigator,
            ),
        );
    }

    findChoices(
        grid: OpponentGrid<ColumnIndex, RowIndex, OpponentCell>,
        previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined,
    ): Either<InvalidAIStrategy<ColumnIndex, RowIndex, OpponentCell>, AppliedChoiceStrategy<ColumnIndex, RowIndex>> {
        this.recordPreviousMove(previousMove);

        const { previousHits } = this;

        const untouchedCoordinates = this.findUntouchedCoordinates(grid);

        const alignedHitCoordinatesList = this.coordinateNavigator.findAlignments(
            previousHits,
            5,  // TODO: double check this number
        );

        const filters: List<ChoiceStrategy<ColumnIndex, RowIndex>> = List([
                ...this.createChoiceStrategies(
                    previousHits,
                    alignedHitCoordinatesList,
                ),
                // Always keep this one as a fallback as any previous strategy may
                // result in an empty choice
                createNoFilterFilterStrategy(),
            ].filter(isNotUndefined)
        );

        const choicesList = filters
            .map(createApplyStrategyMapper(untouchedCoordinates))
            .filter(({ coordinates }) => coordinates.size > 0)
            .sort(sortByAscendingSize);

        return this.checkChoicesFound(
            grid,
            untouchedCoordinates,
            filters,
            choicesList,
        );
    }

    private createChoiceStrategies(
        previousHits: List<Coordinate<ColumnIndex, RowIndex>>,
        alignedHitCoordinatesList: List<CoordinateAlignment<ColumnIndex, RowIndex>>,
    ): ReadonlyArray<ChoiceStrategy<ColumnIndex, RowIndex>> {
        const strategies: Array<ChoiceStrategy<ColumnIndex, RowIndex> | undefined> = [];

        if (this.enableSmartTargeting) {
            strategies.push(
                ...previousHits.map(
                    (previousHit) => this.createTargetSurroundingCoordinatesFilterStrategy(previousHit),
                ),
                ...alignedHitCoordinatesList.flatMap(
                    (alignedHitCoordinates) => [
                        this.createTargetAlignmentGapsFilterStrategy(alignedHitCoordinates),
                        this.createTargetAlignmentExtremumsFilterStrategy(alignedHitCoordinates),
                    ],
                )
            );
        }

        if (this.enableSmartScreening) {
            // TODO: adjust this number
            const possibleTraverses = this.coordinateNavigator.traverseGrid(2);

            strategies.push(
                ...possibleTraverses.map(
                    (possibleTraverse) => this.createGridScreeningFilterStrategy(possibleTraverse),
                ),
            );
        }

        return strategies.filter(isNotUndefined);
    }

    private createTargetSurroundingCoordinatesFilterStrategy(
        hitTarget: Coordinate<ColumnIndex, RowIndex>,
    ): ChoiceStrategy<ColumnIndex, RowIndex> | undefined {
        // Picks the coordinates surrounding the given hit target.
        const validCandidates = Set(
            this.coordinateNavigator.getSurroundingCoordinates(hitTarget),
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
        alignedHitCoordinates: CoordinateAlignment<ColumnIndex, RowIndex>,
    ): ChoiceStrategy<ColumnIndex, RowIndex> | undefined {
        // Picks the coordinates between aligned hit coordinates.
        const validCandidates = this.coordinateNavigator.findAlignmentGaps(alignedHitCoordinates);

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
        alignedHitCoordinates: CoordinateAlignment<ColumnIndex, RowIndex>,
    ): ChoiceStrategy<ColumnIndex, RowIndex> | undefined {
        // Picks the extremums coordinates of aligned hit coordinates.
        const validCandidates = this.coordinateNavigator.findNextExtremums(alignedHitCoordinates);

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

    private createGridScreeningFilterStrategy(
        coordinates: List<Coordinate<ColumnIndex, RowIndex>>,
    ): ChoiceStrategy<ColumnIndex, RowIndex> | undefined {
        const validCandidates = coordinates;

        if (validCandidates.size === 0) {
            return undefined;
        }

        return {
            strategy: 'GridScreening',
            filter: (candidate) => validCandidates.includes(candidate),
        };
    }

    private recordPreviousMove(previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined): void {
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

    private checkChoicesFound(
        grid: OpponentGrid<ColumnIndex, RowIndex, OpponentCell>,
        untouchedCoordinates: Map<string, Coordinate<ColumnIndex, RowIndex>>,
        filters: List<ChoiceStrategy<ColumnIndex, RowIndex>>,
        choicesList: List<AppliedChoiceStrategy<ColumnIndex, RowIndex>>,
    ): Either<InvalidAIStrategy<ColumnIndex, RowIndex, OpponentCell>, AppliedChoiceStrategy<ColumnIndex, RowIndex>> {
        // Depending on the strategy adopted, the AI may not be smart enough and
        // end up having to rely on the fallback. For example with only smart
        // targeting for now we may have the following scenario:
        //
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
        const limitingStrategy = this.enableSmartTargeting;
        const foundEnoughChoices = limitingStrategy || choicesList.size > 1 || filters.size === 1;

        return foundEnoughChoices
            ? Either.right(choicesList.first()!)
            : Either.left(
                new InvalidAIStrategy(
                    grid,
                    untouchedCoordinates,
                    this.previousMoves,
                    this.previousHits,
                    choicesList,
                ),
            );
    }
}

type ChoiceStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    > = {
    readonly strategy: string,
    readonly filter: (coordinate: Coordinate<ColumnIndex, RowIndex>)=> boolean,
};

type AppliedChoiceStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    > = {
    readonly strategy: string,
    readonly coordinates: Map<string, Coordinate<ColumnIndex, RowIndex>>,
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

function sortByAscendingSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(a: AppliedChoiceStrategy<ColumnIndex, RowIndex>, b: AppliedChoiceStrategy<ColumnIndex, RowIndex>): number {
    return a.coordinates.size - b.coordinates.size;
}

function createNoFilterFilterStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(): ChoiceStrategy<ColumnIndex, RowIndex> {
    return {
        strategy: 'NoFilter',
        filter: () => true,
    };
}

function ofRandomCoordinate<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    choices: AppliedChoiceStrategy<ColumnIndex, RowIndex>,
    coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
): Observable<Coordinate<ColumnIndex, RowIndex>> {
    const coordinates = choices
        .coordinates
        .sort(coordinateNavigator.createCoordinatesSorter())
        .valueSeq()
        .toArray();

    const pickedCoordinate = sample(coordinates);
    assertIsNotUndefined(pickedCoordinate);

    return of(pickedCoordinate);
}

export class InvalidAIStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> extends Error {
    constructor(
        readonly grid: OpponentGrid<ColumnIndex, RowIndex, Cell>,
        readonly untouchedCoordinates: Map<string, Coordinate<ColumnIndex, RowIndex>>,
        readonly previousMoves: List<PreviousMove<ColumnIndex, RowIndex>>,
        readonly previousHits: List<Coordinate<ColumnIndex, RowIndex>>,
        readonly choicesList: List<AppliedChoiceStrategy<ColumnIndex, RowIndex>>,
    ) {
        super('Not enough choices!');

        this.name = 'InvalidAIStrategy';
    }
}
