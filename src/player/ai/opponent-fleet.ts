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
import {
    createOpponentShip, isNotFoundShip, isSunkShip, isUnverifiedSunkShip, NotFoundShip,
    OpponentShipStatus,
    Ship, SunkShip,
    UnverifiedSunkShip,
} from './opponent-ship';
import { PreviousMoves } from './previous-moves';

export class OpponentFleet<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    #fleet: List<Ship<ColumnIndex, RowIndex>>;
    #minShipSize: ShipSize;
    #maxShipSize: ShipSize;
    #verifiedMaxShipSize: ShipSize;

    constructor(
        gameFleet: Fleet,
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        private readonly previousMoves: PreviousMoves<ColumnIndex, RowIndex>,
        private readonly logger: Logger,
    ) {
        const opponentFleet = List(
            gameFleet.map((ship) => createOpponentShip<ColumnIndex, RowIndex>(ship)),
        );

        this.#fleet = opponentFleet;

        this.#minShipSize = calculateMinShipSize(opponentFleet);
        this.#maxShipSize = calculateMaxShipSize(opponentFleet);
        this.#verifiedMaxShipSize = this.#maxShipSize;
    }

    get minShipSize(): ShipSize {
        return this.#minShipSize;
    }

    get maxShipSize(): ShipSize {
        return this.#maxShipSize;
    }

    get verifiedMaxShipSize(): ShipSize {
        return this.#verifiedMaxShipSize;
    }

    get fleet(): List<Ship<ColumnIndex, RowIndex>> {
        return this.#fleet;
    }

    notFoundShips(searchedSize?: ShipSize): List<NotFoundShip<ColumnIndex, RowIndex>> {
        const isSearchedShipSize = (size: ShipSize) => searchedSize === undefined || size === searchedSize;

        return this.#fleet.filter(
            (ship): ship is NotFoundShip<ColumnIndex, RowIndex> => {
                return isNotFoundShip(ship) && isSearchedShipSize(ship.size);
            },
        );
    }

    nonVerifiedSunkShips(searchedSize?: ShipSize): List<UnverifiedSunkShip<ColumnIndex, RowIndex>> {
        const isSearchedShipSize = (size: ShipSize) => searchedSize === undefined || size === searchedSize;

        return this.#fleet.filter(
            (ship): ship is UnverifiedSunkShip<ColumnIndex, RowIndex> => {
                return isUnverifiedSunkShip(ship) && isSearchedShipSize(ship.size);
            },
        );
    }

    nonSunkShips(searchedSize?: ShipSize): List<NotFoundShip<ColumnIndex, RowIndex> | UnverifiedSunkShip<ColumnIndex, RowIndex>> {
        const isSearchedShipSize = (size: ShipSize) => searchedSize === undefined || size === searchedSize;

        return this.#fleet.filter(
            (ship): ship is NotFoundShip<ColumnIndex, RowIndex> | UnverifiedSunkShip<ColumnIndex, RowIndex> => {
                return (isNotFoundShip(ship) || isUnverifiedSunkShip(ship))
                    && isSearchedShipSize(ship.size);
            },
        );
    }

    sunkShips(searchedSize?: ShipSize): List<SunkShip<ColumnIndex, RowIndex>> {
        const isSearchedShipSize = (size: ShipSize) => searchedSize === undefined || size === searchedSize;

        return this.#fleet.filter(
            (ship): ship is SunkShip<ColumnIndex, RowIndex> => {
                return isSunkShip(ship) && isSearchedShipSize(ship.size);
            },
        );
    }

    private updateShip<T extends Ship<ColumnIndex, RowIndex>>(
        ship: T,
        update: (previous: T)=> Ship<ColumnIndex, RowIndex>,
    ): void {
        const shipIndex = this.#fleet.indexOf(ship);
        assert(-1 !== shipIndex, `Expected to find the ship ${ship.toString()} among the fleet.`);

        this.#fleet = this.#fleet.set(shipIndex, update(ship));
        this.recalculateSize();
    }

    markAsNonVerifiedSunk(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> {
        const alignmentSize = sunkAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const matchingShip = this.notFoundShips(alignmentSize).first();

        let result: Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> | undefined;

        if (undefined === matchingShip) {
            this.logger.log('No matching ship found.');

            // This means one of the ship we thought we sank was not of the size
            // we expected. In other words, it was not one single ship but rather
            // a ship AND bits of another one.
            const incorrectShip = this.nonVerifiedSunkShips(alignmentSize).first();
            assertIsNotUndefined(incorrectShip);

            const suspiciousAlignment = incorrectShip.alignment;

            this.updateShip(
                incorrectShip,
                (ship) => {
                    this.logger.log(`Marking the ship ${ship.toString()} as not found.`);

                    return ship.markAsNotFound();
                },
            );

            result = Either.left(List([
                sunkAlignment,
                suspiciousAlignment,
            ]));
        } else {
            this.updateShip(
                matchingShip,
                (ship) => {
                    this.logger.log(`Marking ship ${ship.toString()} as non-verified sunk on ${sunkAlignment.toString()}.`);

                    return ship.markAsNonVerifiedSunk(sunkAlignment);
                },
            );

            result = Either.right(undefined);
        }

        this.logState();

        return result;
    }

    markAsSunk(sunkAlignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const alignmentSize = sunkAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const matchingShip = this.notFoundShips(alignmentSize).first();
        assertIsNotUndefined(matchingShip, 'Expected to find a not found ship of this size.');

        this.logger.log(`Marking ship size:${matchingShip.size} = (${sunkAlignment.sortedCoordinates.map(toString).join(', ')}) as sunk.`);

        this.updateShip(
            matchingShip,
            (ship) => ship.markAsSunk(sunkAlignment),
        );

        this.logState();
    }

    recordOrphanHit(
        orphanHit: Coordinate<ColumnIndex, RowIndex>,
        invalidAlignments: List<CoordinateAlignment<ColumnIndex, RowIndex>>,
        sunkCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
    ): CoordinateAlignment<ColumnIndex, RowIndex> | undefined {
        this.logger.log(`Looking for the non-verified sunk ship that can contain the orphan hit ${orphanHit.toString()}.`);

        let shipThatMayContainOrphan: UnverifiedSunkShip<ColumnIndex, RowIndex> | undefined;
        let shipsThatMayContainOrphan = this.nonVerifiedSunkShips().filter(
            ({ alignment }) => {
                // TODO: there is probably more to do here... For example if the
                // alignment is F3,F4,F5,F6,F7 and the sunk hit is F7, we do not
                // want a match if the orphan hit is F8.
                return alignment.nextExtremums.contains(orphanHit)
                    && !invalidAlignments.contains(alignment);
            },
        );

        if (shipsThatMayContainOrphan.size === 1) {
            shipThatMayContainOrphan = shipsThatMayContainOrphan.first()!;
        } else {
            assert(
                shipsThatMayContainOrphan.size === 0,
                `Did not expect to find more than one non-verified sunk ship for which the next extremum is the orphan hit. Found: "${shipsThatMayContainOrphan.join('", "')}"`,
            );

            // If we arrive here it means we previously attempted to split up
            // an alignment which resulted in an orphan hit.
            // This means the alignment we tried to split up was indeed correct.
            shipsThatMayContainOrphan = this.nonVerifiedSunkShips().filter(
                ({ alignment }) => {
                    // TODO: there is probably more to do here... For example if the
                    // alignment is F3,F4,F5,F6,F7 and the sunk hit is F7, we do not
                    // want a match if the orphan hit is F8.
                    return alignment.nextExtremums.contains(orphanHit);
                },
            );

            assert(
                shipsThatMayContainOrphan.size === 1,
                `Expected to find exactly one ship for which the next extremum is the orphan hit. Found: "${shipsThatMayContainOrphan.join('", "')}"`,
            );

            shipThatMayContainOrphan = shipsThatMayContainOrphan.first()!;
        }

        const incorrectAlignmentCoordinates = shipThatMayContainOrphan.alignment.sortedCoordinates;
        this.updateShip(
            shipThatMayContainOrphan,
            (ship) => {
                this.logger.log(`Marking the ship ${ship.toString()} as not found.`);

                return ship.markAsNotFound();
            },
        );

        const correctAlignmentSize = incorrectAlignmentCoordinates.size + 1;
        assertIsShipSize(correctAlignmentSize);

        const correctAlignment = this.coordinateNavigator
            .findAlignments(
                incorrectAlignmentCoordinates.push(orphanHit),
                correctAlignmentSize,
            )
            .first();

        assertIsNotUndefined(correctAlignment, 'Expected to find an alignment.');

        this.logger.log(`Looking for the ship matching the alignment ${correctAlignment.toString()} to mark it as sunk.`);

        // TODO: coordinate alignment could have a helper to convert to alignment size
        const alignmentSize = correctAlignment.sortedCoordinates.size;
        assertIsShipSize(alignmentSize, `Invalid ship size ${alignmentSize}.`);

        const nonVerifiedSunkShips = this.nonVerifiedSunkShips(alignmentSize);

        let suspiciousAlignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined = undefined;

        if (nonVerifiedSunkShips.size === 0) {
            const sunkCoordinatesBelongingToAlignment = sunkCoordinates.filter(
                (coordinate) => correctAlignment.contains(coordinate),
            );

            assert(sunkCoordinatesBelongingToAlignment.size === 1, () => `Expected to find exactly one sunk coordinate within the alignment ${correctAlignment.toString()}. Found: ${sunkCoordinatesBelongingToAlignment.join(', ')}.`);

            // Do nothing: there is no non-verified ship to mark as not found.
        } else {
            assert(nonVerifiedSunkShips.size === 1, () => `Expected to find exactly one non-verified sunk ship of the size ${alignmentSize}. Found ${nonVerifiedSunkShips.size}: ${nonVerifiedSunkShips.map(toString).join(', ')}.`);
            const nonVerifiedSunkShip = nonVerifiedSunkShips.first()!;

            suspiciousAlignment = nonVerifiedSunkShip.alignment;

            this.updateShip(
                nonVerifiedSunkShip,
                (ship) => {
                    this.logger.log(`Marking the ship ${ship.toString()} as not found.`);

                    return ship.markAsNotFound();
                },
            );
        }

        const correctShip = this.nonSunkShips(alignmentSize).first()!;

        this.updateShip(
            correctShip,
            (ship) => {
                this.logger.log(`Marking the ship ${ship.toString()} as sunk in ${correctAlignment.toString()}.`);

                return ship.markAsSunk(correctAlignment);
            },
        );

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
     * This method returns the exhaustive list of non-verified sunk ships for
     * which the alignment contains at least one of the hit coordinate of the
     * sunk coordinate.
     */
    reviewNonVerifiedSunkShips(
        incorrectSunk: Coordinate<ColumnIndex, RowIndex>,
    ): List<CoordinateAlignment<ColumnIndex, RowIndex>> {
        const surroundingHitCoordinates = this.getSurroundingHitCoordinates(incorrectSunk);

        const alignmentContainsSurroundingHitCoordinates: (alignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined)=> boolean = (alignment) => surroundingHitCoordinates.reduce(
            (contains: boolean, coordinate) => contains || (undefined !== alignment && alignment.contains(coordinate)),
            false,
        );

        return this.nonVerifiedSunkShips()
            .filter(
                ({ alignment }) => alignmentContainsSurroundingHitCoordinates(alignment),
            )
            .map((suspiciousShip) => {
                this.updateShip(
                    suspiciousShip,
                    (ship) => ship.markAsNotFound(),
                );

                return suspiciousShip.alignment;
            });
    }

    recalculateSize(): void {
        const { fleet } = this;

        this.#minShipSize = calculateMinShipSize(fleet);
        this.#maxShipSize = calculateMaxShipSize(fleet);
        this.#verifiedMaxShipSize = calculateConfirmedMaxShipSize(fleet);
    }

    private logState(): void {
        const notFoundShips = this.notFoundShips().map(toString).toArray();
        const nonVerifiedSunkShips = this.nonVerifiedSunkShips().map(toString).toArray();
        const sunkShips = this.sunkShips().map(toString).toArray();

        this.logger.log({
            label: 'Fleet state',
            notFoundShips,
            nonVerifiedSunkShips,
            sunkShips,
            min: this.#minShipSize,
            max: this.#maxShipSize,
            confirmedMax: this.#verifiedMaxShipSize,
        });
    }
}

function calculateMinShipSize<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(fleet: List<Ship<ColumnIndex, RowIndex>>): ShipSize {
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
>(fleet: List<Ship<ColumnIndex, RowIndex>>): ShipSize {
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
>(fleet: List<Ship<ColumnIndex, RowIndex>>): ShipSize {
    const max = fleet
        .filter((ship) => ship.status !== OpponentShipStatus.SUNK)
        .map((ship) => ship.size)
        .max();

    assertIsShipSize(max);

    return max;
}
