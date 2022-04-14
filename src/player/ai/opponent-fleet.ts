import { List } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../../assert/assert';
import { Coordinate } from '../../grid/coordinate';
import {
    completeAlignment, CoordinateAlignment, PotentialShipAlignment, verifyAlignment,
} from '../../grid/coordinate-alignment';
import { CoordinateNavigator } from '../../grid/coordinate-navigator';
import { Logger } from '../../logger/logger';
import { Fleet } from '../../ship/fleet';
import { assertIsShipSize, ShipSize } from '../../ship/ship-size';
import { Either } from '../../utils/either';
import {
    createOpponentShip, isNotFoundShip, isSunkShip, isUnverifiedSunkShip, NotFoundShip,
    OpponentShipStatus, Ship, SunkShip, UnverifiedSunkShip,
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

    /**
     * Returns nothing on success. On failure, it means one of the previously
     * thought sunk ship is not of the expected size, in which case it is un-marked
     * as non-verified sunk and its alignment is returned along with the given
     * alignment.
     */
    markAsNonVerifiedSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> {
        return this.markMatchingShip(
            alignment,
            (ship) => {
                this.logger.log(`Marking ship ${ship.toString()} sunk on ${alignment.toString()}.`);

                return ship.markAsNonVerifiedSunk(alignment);
            },
        );
    }

    markAsSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> {
        return this.markMatchingShip(
            alignment,
            (ship) => {
                this.logger.log(`Marking ship ${ship.toString()} sunk on ${alignment.toString()}.`);

                return ship.markAsSunk(alignment);
            },
        );
    }

    private markMatchingShip(
        alignment: CoordinateAlignment<ColumnIndex, RowIndex>,
        handleMatchingShip: (matchingShip: NotFoundShip<ColumnIndex, RowIndex>)=> Ship<ColumnIndex,RowIndex>,
    ): Either<List<CoordinateAlignment<ColumnIndex, RowIndex>>, void> {
        const { alignmentSize } = verifyAlignment(alignment).getOrThrowLeft();
        const matchingShip = this.notFoundShips(alignmentSize).first();

        if (undefined !== matchingShip) {
            this.updateShip(
                matchingShip,
                handleMatchingShip,
            );

            return Either.right(undefined);
        }

        // This means one of the ship we thought we sank was not of the size
        // we expected. In other words, it was not one single ship but rather
        // a ship AND bits of another one.
        this.logger.log('No matching ship found: check non-verified sunk ships.');

        const nonVerifiedSunkShips = this.nonVerifiedSunkShips(alignmentSize);
        assert(
            nonVerifiedSunkShips.size === 1,
            `Expected to find one and only one non-verified sunk ship of the size ${alignmentSize}.`,
        );

        const incorrectShip = nonVerifiedSunkShips.first()!;
        const suspiciousAlignment = incorrectShip.alignment;

        this.updateShip(
            incorrectShip,
            (ship) => {
                this.logger.log(`Marking the ship ${ship.toString()} as not found.`);

                return ship.markAsNotFound();
            },
        );

        return Either.left(List([
            alignment,
            suspiciousAlignment,
        ]));
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

        const incorrectAlignment = shipThatMayContainOrphan.alignment;
        this.updateShip(
            shipThatMayContainOrphan,
            (ship) => {
                this.logger.log(`Marking the ship ${ship.toString()} as not found.`);

                return ship.markAsNotFound();
            },
        );

        const correctAlignment = this.correctAlignment(
            incorrectAlignment,
            orphanHit,
            this.previousMoves.sunkCoordinates,
        );

        this.logger.log(`Looking for the ship matching the alignment ${correctAlignment.toString()} to mark it as sunk.`);

        const nonVerifiedSunkShips = this.nonVerifiedSunkShips(correctAlignment.alignmentSize);

        let suspiciousAlignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined = undefined;

        if (nonVerifiedSunkShips.size !== 0) {
            assert(nonVerifiedSunkShips.size === 1, () => `Expected to find exactly one non-verified sunk ship of the size ${correctAlignment.alignmentSize}. Found ${nonVerifiedSunkShips.size}: ${nonVerifiedSunkShips.map(toString).join(', ')}.`);
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

        const correctShip = this.nonSunkShips(correctAlignment.alignmentSize).first()!;

        this.updateShip(
            correctShip,
            (ship) => {
                this.logger.log(`Marking the ship ${ship.toString()} as sunk in ${correctAlignment.alignment.toString()}.`);

                return ship.markAsSunk(correctAlignment.alignment);
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

    private correctAlignment(
        incorrectAlignment: CoordinateAlignment<ColumnIndex, RowIndex>,
        missingCoordinate: Coordinate<ColumnIndex, RowIndex>,
        sunkCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
    ): PotentialShipAlignment<ColumnIndex, RowIndex> {
        let newAlignment = completeAlignment(
            {
                direction: incorrectAlignment.direction,
                coordinates: incorrectAlignment.sortedCoordinates.push(missingCoordinate),
            },
            this.coordinateNavigator,
        );

        newAlignment.extremums.forEach((extremum) => {
            if (sunkCoordinates.contains(extremum)) {
                newAlignment = newAlignment.removeNextExtremum(extremum);
            }
        });

        return verifyAlignment(newAlignment).getOrThrowLeft();
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

    private updateShip<T extends Ship<ColumnIndex, RowIndex>>(
        ship: T,
        update: (previous: T)=> Ship<ColumnIndex, RowIndex>,
    ): void {
        const shipIndex = this.#fleet.indexOf(ship);
        assert(-1 !== shipIndex, `Expected to find the ship ${ship.toString()} among the fleet.`);

        this.#fleet = this.#fleet.set(shipIndex, update(ship));
        this.recalculateSize();

        this.logState();
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
