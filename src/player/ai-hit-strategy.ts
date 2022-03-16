import { List, Map } from 'immutable';
import { sample } from 'lodash';
import { Observable, of } from 'rxjs';
import { assertIsNotUndefined, isNotUndefined } from '../assert/assert-is-not-undefined';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { CoordinateNavigator } from '../grid/coordinate-navigator';
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
    ) {
    }

    decide(
        grid: OpponentGrid<ColumnIndex, RowIndex, OpponentCell>,
        previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined,
    ): Observable<Coordinate<ColumnIndex, RowIndex>> {
        const availableCoordinates = this.findChoices(grid, previousMove);

        return availableCoordinates.fold(
            this.handleError,
            (coordinates) => ofRandomCoordinate(coordinates),
        );
    }

    findChoices(
        grid: OpponentGrid<ColumnIndex, RowIndex, OpponentCell>,
        previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined,
    ): Either<InvalidAIStrategy<ColumnIndex, RowIndex, OpponentCell>, ReadonlyArray<Coordinate<ColumnIndex, RowIndex>>> {
        this.recordPreviousMove(previousMove);

        const untouchedCoordinates = this.findUntouchedCoordinates(grid);

        const filters: List<ChoiceStrategy<ColumnIndex, RowIndex>> = List([
                ...this.createChoiceStrategies(),
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

    private createChoiceStrategies(): ReadonlyArray<ChoiceStrategy<ColumnIndex, RowIndex>> {
        return [];
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
    ): Either<InvalidAIStrategy<ColumnIndex, RowIndex, OpponentCell>, ReadonlyArray<Coordinate<ColumnIndex, RowIndex>>> {
        const foundEnoughChoices = choicesList.size > 1 || filters.size === 1;

        return foundEnoughChoices
            ? Either.right(selectFirstChoices(choicesList))
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

function selectFirstChoices<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    choicesList: List<AppliedChoiceStrategy<ColumnIndex, RowIndex>>,
): ReadonlyArray<Coordinate<ColumnIndex, RowIndex>> {
    return choicesList
        .first()!
        .coordinates
        .valueSeq()
        .toArray();
}

function ofRandomCoordinate<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(choices: ReadonlyArray<Coordinate<ColumnIndex, RowIndex>>): Observable<Coordinate<ColumnIndex, RowIndex>> {
    const value = sample(choices);
    assertIsNotUndefined(value);

    return of(value);
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
