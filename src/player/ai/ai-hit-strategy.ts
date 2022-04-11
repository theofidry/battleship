import { List, Map, Set } from 'immutable';
import { sample } from 'lodash';
import { Observable, of } from 'rxjs';
import { assertIsNotUndefined, isNotUndefined } from '../../assert/assert-is-not-undefined';
import { Coordinate } from '../../grid/coordinate';
import { CoordinateAlignment } from '../../grid/coordinate-alignment';
import { CoordinateNavigator } from '../../grid/coordinate-navigator';
import { OpponentGrid } from '../../grid/opponent-grid';
import { Logger } from '../../logger/logger';
import { Fleet } from '../../ship/fleet';
import { ShipSize } from '../../ship/ship-size';
import { Either } from '../../utils/either';
import { HitStrategy, PreviousMove } from '../hit-strategy';
import { MoveAnalyzer } from './move-analyzer';
import { AiHitStrategyStateRecorder } from './ai-hit-strategy-state-recorder';

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
    private movesAnalyzer: MoveAnalyzer<ColumnIndex, RowIndex, OpponentCell>;

    constructor(
        private readonly fleet: Fleet,
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly findUntouchedCoordinates: UntouchedCoordinatesFinder<ColumnIndex, RowIndex, OpponentCell>,
        private readonly handleError: AIErrorHandler<ColumnIndex, RowIndex, OpponentCell>,
        private readonly stateRecorder: AiHitStrategyStateRecorder<ColumnIndex, RowIndex, OpponentCell>,
        private readonly logger: Logger,
        private readonly enableSmartTargeting: boolean,
        private readonly enableSmartScreening: boolean,
        private readonly enableShipSizeTracking: boolean,
    ) {
        this.movesAnalyzer = new MoveAnalyzer(
            coordinateNavigator,
            fleet,
            logger,
            enableShipSizeTracking,
        );
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
        this.movesAnalyzer.recordPreviousMove(previousMove);

        const previousHits = this.movesAnalyzer.getPreviousHits();
        const alignedHitCoordinatesList = this.movesAnalyzer.getHitAlignments();
        const suspiciousAlignedHitCoordinatesList = this.movesAnalyzer.getSuspiciousHitAlignments();

        const untouchedCoordinates = this.findUntouchedCoordinates(grid);

        const filters: List<ChoiceStrategy<ColumnIndex, RowIndex>> = List([
                ...this.createChoiceStrategies(
                    previousHits,
                    alignedHitCoordinatesList,
                    suspiciousAlignedHitCoordinatesList,
                ),
                // Always keep this one as a fallback as any previous strategy may
                // result in an empty choice
                createNoFilterFilterStrategy(),
            ].filter(isNotUndefined),
        );

        const choicesList = filters
            .map(createApplyStrategyMapper(untouchedCoordinates))
            .filter(({ coordinates }) => coordinates.size > 0)
            .sort(sortStrategies);

        this.stateRecorder.recordChoices(
            grid,
            untouchedCoordinates,
            previousHits,
            alignedHitCoordinatesList,
            filters,
            choicesList,
        );

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
        suspiciousAlignedHitCoordinatesList: List<CoordinateAlignment<ColumnIndex, RowIndex>>,
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
                ),
                ...suspiciousAlignedHitCoordinatesList.flatMap(
                    (alignedHitCoordinates) => [
                        this.createTargetAlignmentGapsFilterStrategy(alignedHitCoordinates),
                        this.createTargetAlignmentExtremumsFilterStrategy(alignedHitCoordinates),
                    ],
                ),
            );
        }

        if (this.enableSmartScreening) {
            const maxShipSize = this.movesAnalyzer.getMaxShipSize();
            const possibleTraverses = this.coordinateNavigator.traverseGrid(maxShipSize);

            strategies.push(
                ...possibleTraverses.map(
                    (possibleTraverse) => this.createGridScreeningFilterStrategy(
                        possibleTraverse,
                        maxShipSize,
                    ),
                ),
            );
        }

        return strategies.filter(isNotUndefined);
    }

    private createTargetSurroundingCoordinatesFilterStrategy(
        hitTarget: Coordinate<ColumnIndex, RowIndex>,
    ): ChoiceStrategy<ColumnIndex, RowIndex> | undefined {
        // Picks the sortedCoordinates surrounding the given hit target.
        const validCandidates = this.coordinateNavigator.getSurroundingCoordinates(hitTarget);

        if (validCandidates.size === 0) {
            return undefined;
        }

        // TODO: optimize this code. Indeed if we are looking for a ship of
        //  size 3 and we have the following configuration:
        //     A  B  C  D
        //  1
        //  2     H
        //  3
        //  Then the current surrounding sortedCoordinates are B1, A2, C2, B3.
        //  However a ship of size 3 is unlikely to be in B1 and A2. It is not
        //  impossible, the ship could be A2,B2,C2 or B1,B2,B3, but in this
        //  scenario the sortedCoordinates B3 and C2 would be hit as well so in either
        //  cases it would be more interesting to aim at those ones.

        return {
            strategy: `HitTargetSurroundings<${hitTarget.toString()}>`,
            weight: StrategyWeight.SURROUNDING,
            filter: (candidate) => validCandidates.includes(candidate),
        };
    }

    private createTargetAlignmentGapsFilterStrategy(
        alignedHitCoordinates: CoordinateAlignment<ColumnIndex, RowIndex>,
    ): ChoiceStrategy<ColumnIndex, RowIndex> | undefined {
        // Picks the sortedCoordinates between aligned hit sortedCoordinates.
        const validCandidates = alignedHitCoordinates.sortedGaps;

        if (validCandidates.size === 0) {
            return undefined;
        }

        return {
            strategy: `HitAlignedGapsHitTargets<${alignedHitCoordinates.toString()}>`,
            weight: StrategyWeight.ALIGNMENT_GAPS,
            filter: (candidate) => validCandidates.includes(candidate),
        };
    }

    private createTargetAlignmentExtremumsFilterStrategy(
        alignedHitCoordinates: CoordinateAlignment<ColumnIndex, RowIndex>,
    ): ChoiceStrategy<ColumnIndex, RowIndex> | undefined {
        // Picks the next extremums coordinates of aligned hit sortedCoordinates.
        const validCandidates = alignedHitCoordinates.nextExtremums;

        if (validCandidates.size === 0) {
            return undefined;
        }

        return {
            strategy: `HitAlignedExtremumsHitTargets<${alignedHitCoordinates.toString()}>`,
            weight: StrategyWeight.ALIGNMENT,
            filter: (candidate) => validCandidates.includes(candidate),
        };
    }

    private createGridScreeningFilterStrategy(
        coordinates: List<Coordinate<ColumnIndex, RowIndex>>,
        size: ShipSize,
    ): ChoiceStrategy<ColumnIndex, RowIndex> | undefined {
        const validCandidates = coordinates;

        if (validCandidates.size === 0) {
            return undefined;
        }

        return {
            strategy: `GridScreening<${size}>`,
            weight: StrategyWeight.SCREENING,
            filter: (candidate) => validCandidates.includes(candidate),
        };
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
        const limitingStrategy = this.enableSmartTargeting && !this.enableSmartScreening;
        const foundEnoughChoices = limitingStrategy || choicesList.size > 1 || filters.size === 1;

        return foundEnoughChoices
            ? Either.right(choicesList.first()!)
            : Either.left(
                new InvalidAIStrategy(
                    grid,
                    untouchedCoordinates,
                    this.movesAnalyzer.getPreviousMoves(),
                    this.movesAnalyzer.getPreviousHits(),
                    choicesList,
                ),
            );
    }
}

enum StrategyWeight {
    NO_FILTER = 0,
    SCREENING = 5,
    SURROUNDING = 10,
    ALIGNMENT = 20,
    ALIGNMENT_GAPS = 30,
}

export type ChoiceStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    readonly strategy: string,
    readonly weight: StrategyWeight,
    readonly filter: (coordinate: Coordinate<ColumnIndex, RowIndex>)=> boolean,
};

export type AppliedChoiceStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    readonly strategy: string,
    readonly weight: StrategyWeight,
    readonly coordinates: Map<string, Coordinate<ColumnIndex, RowIndex>>,
};

function createApplyStrategyMapper<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    source: Map<string, Coordinate<ColumnIndex, RowIndex>>,
): (choiceStrategy: ChoiceStrategy<ColumnIndex, RowIndex>)=> AppliedChoiceStrategy<ColumnIndex, RowIndex> {
    return ({ strategy, weight, filter }) => ({
        strategy,
        weight,
        coordinates: source.filter(filter),
    });
}

function sortStrategies<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(a: AppliedChoiceStrategy<ColumnIndex, RowIndex>, b: AppliedChoiceStrategy<ColumnIndex, RowIndex>): number {
    // The bigger the weight be better
    const weightDiff = b.weight - a.weight;
    const weightAreIdentical = Math.abs(weightDiff) < 0.001;

    if (!weightAreIdentical) {
        return weightDiff;
    }

    // The lower the size the better
    return a.coordinates.size - b.coordinates.size;
}

function createNoFilterFilterStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(): ChoiceStrategy<ColumnIndex, RowIndex> {
    return {
        strategy: 'NoFilter',
        weight: StrategyWeight.NO_FILTER,
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
