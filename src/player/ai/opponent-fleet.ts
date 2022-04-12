import { List } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../../assert/assert';
import { assertIsNotUndefined } from '../../assert/assert-is-not-undefined';
import { Coordinate } from '../../grid/coordinate';
import { CoordinateAlignment } from '../../grid/coordinate-alignment';
import { CoordinateNavigator } from '../../grid/coordinate-navigator';
import { Logger } from '../../logger/logger';
import { Fleet } from '../../ship/fleet';
import { assertIsShipSize, ShipSize } from '../../ship/ship-size';
import { Either } from '../../utils/either';
import { OpponentShip, OpponentShipStatus } from './opponent-ship';
import { PreviousMoves } from './previous-moves';

export class OpponentFleet<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    readonly #fleet: List<OpponentShip<ColumnIndex, RowIndex>>;
    #minShipSize: ShipSize;
    #maxShipSize: ShipSize;
    #confirmedMaxShipSize: ShipSize;

    constructor(
        gameFleet: Fleet,
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly previousMoves: PreviousMoves<ColumnIndex, RowIndex>,
        private readonly logger: Logger,
    ) {
        const opponentFleet = List(
            gameFleet.map((ship) => new OpponentShip<ColumnIndex, RowIndex>(ship.size)),
        );

        this.#fleet = opponentFleet;

        this.#minShipSize = calculateMinShipSize(opponentFleet);
        this.#maxShipSize = calculateMaxShipSize(opponentFleet);
        this.#confirmedMaxShipSize = this.#maxShipSize;
    }

    get minShipSize(): ShipSize {
        return this.#minShipSize;
    }

    get maxShipSize(): ShipSize {
        return this.#maxShipSize;
    }

    get confirmedMaxShipSize(): ShipSize {
        return this.#confirmedMaxShipSize;
    }

    get fleet(): List<OpponentShip<ColumnIndex, RowIndex>> {
        return this.#fleet;
    }

    find(size: ShipSize, statusOrStatuses: OpponentShipStatus | ReadonlyArray<OpponentShipStatus>): List<OpponentShip<ColumnIndex, RowIndex>> {
        const statuses: ReadonlyArray<OpponentShipStatus> = Array.isArray(statusOrStatuses)
            ? statusOrStatuses
            : [statusOrStatuses];

        return this.#fleet.filter(
            (ship) => ship.size === size && statuses.includes(ship.status),
        );
    }

    markAsPotentiallySunk(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> {
        const alignmentSize = sunkAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const unsunkShips = this.find(
            alignmentSize,
            OpponentShipStatus.NOT_FOUND,
        );

        const matchingShip = unsunkShips.first();

        let result: Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> | undefined;

        if (undefined === matchingShip) {
            this.logger.log('No matching ship found.');

            // This means one of the ship we thought we sank was not of the size
            // we expected. In other words, it was not one single ship but rather
            // a ship AND bits of another one.
            const sunkShipOfSize = this.find(
                    alignmentSize,
                    OpponentShipStatus.POTENTIALLY_SUNK,
                )
                .first();

            assertIsNotUndefined(sunkShipOfSize);

            const suspiciousAlignment = sunkShipOfSize.unmarkAsPotentiallySunk();

            this.logger.log(`Un-marking the ship ${sunkShipOfSize.toString()} as potentially sunk.`);

            result = Either.left(List([
                sunkAlignment,
                suspiciousAlignment,
            ]));
        } else {
            this.logger.log(`Marking ship size:${matchingShip.size} = (${sunkAlignment.sortedCoordinates.map(toString).join(', ')}) as potentially sunk.`);

            matchingShip.markAsPotentiallySunk(sunkAlignment);

            result = Either.right(undefined);
        }

        this.recalculateSize();

        this.logState();

        return result;
    }

    markAsSunk(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const alignmentSize = sunkAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const unsunkShips = this.find(
            alignmentSize,
            OpponentShipStatus.NOT_FOUND,
        );

        const matchingShip = unsunkShips.first();
        assertIsNotUndefined(matchingShip, 'Expected to find a not found ship of this size.');

        this.logger.log(`Marking ship size:${matchingShip.size} = (${sunkAlignment.sortedCoordinates.map(toString).join(', ')}) as sunk.`);

        matchingShip.markAsSunk(sunkAlignment);

        this.recalculateSize();

        this.logState();
    }

    recordOrphanHit(
        orphanHit: Coordinate<ColumnIndex, RowIndex>,
        invalidAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>>,
        sunkCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
    ): CoordinateAlignment<ColumnIndex, RowIndex> | undefined {
        this.logger.log(`Looking for the potentially sunk ship that can contain the orphan hit ${orphanHit.toString()}.`);

        let shipThatMayContainOrphan: OpponentShip<ColumnIndex, RowIndex> | undefined;
        let shipsThatMayContainOrphan = this.#fleet.filter(
            (ship) => {
                if (!(ship.status === OpponentShipStatus.POTENTIALLY_SUNK)) {
                    return false;
                }

                const alignment = ship.alignment;

                // TODO: there is probably more to do here... For example if the
                // alignment is F3,F4,F5,F6,F7 and the sunk hit is F7, we do not
                // want a match if the orphan hit is F8.
                return undefined !== alignment
                    && alignment.nextExtremums.contains(orphanHit)
                    && !invalidAlignments.contains(alignment);
            },
        );

        if (shipsThatMayContainOrphan.size === 1) {
            shipThatMayContainOrphan = shipsThatMayContainOrphan.first()!;
        } else {
            assert(
                shipsThatMayContainOrphan.size === 0,
                `Did not expect to find more than one potentially sunk ship for which the next extremum is the orphan hit. Found: "${shipsThatMayContainOrphan.join('", "')}"`,
            );

            // If we arrive here it means we previously attempted to split up
            // an alignment which resulted in an orphan hit.
            // This means the alignment we tried to split up was indeed correct.
            shipsThatMayContainOrphan = this.#fleet.filter(
                (ship) => {
                    if (!(ship.status === OpponentShipStatus.POTENTIALLY_SUNK)) {
                        return false;
                    }

                    const alignment = ship.alignment;

                    // TODO: there is probably more to do here... For example if the
                    // alignment is F3,F4,F5,F6,F7 and the sunk hit is F7, we do not
                    // want a match if the orphan hit is F8.
                    return undefined !== alignment
                        && alignment.nextExtremums.contains(orphanHit);
                },
            );

            assert(
                shipsThatMayContainOrphan.size === 1,
                `Expected to find exactly one ship for which the next extremum is the orphan hit. Found: "${shipsThatMayContainOrphan.join('", "')}"`,
            );

            shipThatMayContainOrphan = shipsThatMayContainOrphan.first()!;
        }

        this.logger.log(`Found the ship ${shipThatMayContainOrphan}.`);

        const incorrectAlignmentCoordinates = shipThatMayContainOrphan.unmarkAsPotentiallySunk().sortedCoordinates;

        const correctAlignmentSize = incorrectAlignmentCoordinates.size + 1;
        assertIsShipSize(correctAlignmentSize);

        const correctAlignment = this.coordinateNavigator
            .findAlignments(
                incorrectAlignmentCoordinates.push(orphanHit),
                correctAlignmentSize,
            )
            .first();

        assertIsNotUndefined(correctAlignment, 'Expected to find an alignment.');

        this.logger.log(`Marking the ship matching the alignment ${correctAlignment.toString()} as sunk.`);

        const alignmentSize = correctAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const potentiallySunkShips = this.#fleet.filter(
            (ship) => ship.status === OpponentShipStatus.POTENTIALLY_SUNK && ship.size === alignmentSize,
        );

        let suspiciousAlignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined = undefined;

        if (potentiallySunkShips.size === 0) {
            const sunkCoordinatesBelongingToAlignment = sunkCoordinates.filter(
                (coordinate) => correctAlignment.contains(coordinate),
            );

            assert(sunkCoordinatesBelongingToAlignment.size === 1, `Expected to find exactly one sunk coordinate within the alignment ${correctAlignment.toString()}. Found: ${sunkCoordinatesBelongingToAlignment.join(', ')}.`);

            // Do nothing: all is good.
        } else {
            assert(potentiallySunkShips.size === 1, `Expected to find exactly one potentially sunk ship of the size ${alignmentSize}. Found ${potentiallySunkShips.size}.`);

            suspiciousAlignment = potentiallySunkShips.first()!.unmarkAsPotentiallySunk();
        }

        const correctShip = this.find(
                alignmentSize,
                [OpponentShipStatus.NOT_FOUND, OpponentShipStatus.POTENTIALLY_SUNK],
            )
            .first()!;

        correctShip.markAsSunk(correctAlignment);

        return suspiciousAlignment;
    }

    private getSurroundingHitCoordinates(coordinate: Coordinate<ColumnIndex, RowIndex>): List<Coordinate<ColumnIndex, RowIndex>> {
        const surroundingCoordinates = this.coordinateNavigator.getSurroundingCoordinates(coordinate);

        return this.previousMoves.hitCoordinates.filter(
            (hitCoordinate) => surroundingCoordinates.contains(hitCoordinate),
        );
    }

    /**
     * We have an unexpected sunk coordinate, which means one of the alignments
     * containing this sunk coordinates is incorrect.
     *
     * This method returns the exhaustive list of potentially sunk ships for
     * which the alignment contains at least one of the hit coordinate of the
     * sunk coordinate.
     */
    reconsiderPotentiallySunkShips(
        incorrectSunk: Coordinate<ColumnIndex, RowIndex>,
    ): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        const surroundingHitCoordinates = this.getSurroundingHitCoordinates(incorrectSunk);

        const alignmentContainsSurroundingHitCoordinates: (alignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined)=> boolean = (alignment) => surroundingHitCoordinates.reduce(
            (contains: boolean, coordinate) => contains || (undefined !== alignment && alignment.contains(coordinate)),
            false,
        );

        const suspiciousAlignments = this.#fleet
            .filter((ship) => {
                return ship.status === OpponentShipStatus.POTENTIALLY_SUNK
                    && alignmentContainsSurroundingHitCoordinates(ship.alignment);
            })
            .map((ship) => ship.unmarkAsPotentiallySunk());

        this.recalculateSize();

        return suspiciousAlignments;
    }

    recalculateSize(): void {
        const fleet = this.#fleet;

        this.#minShipSize = calculateMinShipSize(fleet);
        this.#maxShipSize = calculateMaxShipSize(fleet);
        this.#confirmedMaxShipSize = calculateConfirmedMaxShipSize(fleet);
    }

    private logState(): void {
        const remainingShips: ShipSize[] = [];
        const potentiallySunkShips: ShipSize[] = [];
        const sunkShips: ShipSize[] = [];

        this.#fleet.forEach((ship) => {
            switch (ship.status) {
                case OpponentShipStatus.NOT_FOUND:
                    remainingShips.push(ship.size);
                    break;

                case OpponentShipStatus.POTENTIALLY_SUNK:
                    potentiallySunkShips.push(ship.size);
                    break;

                case OpponentShipStatus.SUNK:
                    potentiallySunkShips.push(ship.size);
                    break;
            }
        });

        this.logger.log({
            remainingShips,
            potentiallySunkShips,
            sunkShips,
            min: this.#minShipSize,
            max: this.#maxShipSize,
            confirmedMax: this.#confirmedMaxShipSize,
        });
    }
}

function calculateMinShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const min = fleet
        .filter((ship) => OpponentShipStatus.NOT_FOUND === ship.status)
        .map((ship) => ship.size)
        .min();

    assertIsShipSize(min);

    return min;
}

function calculateMaxShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const max = fleet
        .filter((ship) => OpponentShipStatus.NOT_FOUND === ship.status)
        .map((ship) => ship.size)
        .max();

    assertIsShipSize(max);

    return max;
}

function calculateConfirmedMaxShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<OpponentShip<ColumnIndex, RowIndex>>): ShipSize {
    const max = fleet
        .filter((ship) => ship.status !== OpponentShipStatus.SUNK)
        .map((ship) => ship.size)
        .max();

    assertIsShipSize(max);

    return max;
}
