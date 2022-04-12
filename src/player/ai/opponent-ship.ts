import { ValueObject } from 'immutable';
import { assert } from '../../assert/assert';
import { CoordinateAlignment } from '../../grid/coordinate-alignment';
import { hashString } from '../../grid/string-hash-code';
import { Ship as ShipModel } from '../../ship/ship';

export enum OpponentShipStatus {
    NOT_FOUND = 'NOT_FOUND',
    NON_VERIFIED_SUNK = 'NON_VERIFIED_SUNK',
    SUNK = 'SUNK',
}

class OpponentShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> extends ShipModel implements ValueObject {
    #status = OpponentShipStatus.NOT_FOUND;
    #alignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined = undefined;

    private createWith(
        status = OpponentShipStatus.NOT_FOUND,
        alignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined = undefined,
    ): OpponentShip<ColumnIndex, RowIndex> {
        const { name, size } = this;
        const newShip = new OpponentShip<ColumnIndex, RowIndex>(name, size);

        newShip.#alignment = alignment;
        newShip.#status = status;

        return newShip;
    }

    get status(): OpponentShipStatus {
        return this.#status;
    }

    get alignment(): CoordinateAlignment<ColumnIndex, RowIndex> | undefined {
        return this.#alignment;
    }

    equals(other: unknown): boolean {
        return other instanceof OpponentShip && this.toString() === other.toString();
    }

    hashCode(): number {
        return hashString(this.toString());
    }

    markAsNotFound(): NotFoundShip<ColumnIndex, RowIndex> {
        const previous = this;
        assert(
            isUnverifiedSunkShip(previous),
            () => `Cannot mark as not found a non-unverified sunk ship. Tried to mark ${this.toString()} as not found.`,
        );

        const ship = this.createWith(
            OpponentShipStatus.NOT_FOUND,
            undefined,
        );

        assert(isNotFoundShip(ship));

        return ship;
    }

    markAsNonVerifiedSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): UnverifiedSunkShip<ColumnIndex, RowIndex> {
        const previous = this;
        assert(
            isShip(previous) && !isSunkShip(previous),
            () => `Cannot non-verify a sunk ship. Tried to mark ${this.toString()} as unverified sunk.`,
        );
        this.checkAlignment(alignment);


        const ship = this.createWith(
            OpponentShipStatus.NON_VERIFIED_SUNK,
            alignment,
        );

        assert(isUnverifiedSunkShip(ship));

        return ship;
    }

    markAsSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): SunkShip<ColumnIndex, RowIndex> {
        const previous = this;
        assert(
            isShip(previous) && !isSunkShip(previous),
            () => `Cannot mark as sunk an already sunk ship. Tried to mark ${this.toString()} as not found.`,
        );
        this.checkAlignment(alignment);

        const ship = this.createWith(
            OpponentShipStatus.SUNK,
            alignment,
        );

        assert(isSunkShip(ship));

        return ship;
    }

    private checkAlignment(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        assert(alignment.sortedGaps.size === 0, `The alignment ${alignment.toString()} is not a valid ship alignment.`);
        assert(
            alignment.sortedCoordinates.size === this.size,
            () => InvalidAlignmentSize.forShip(this, alignment),
        );
    }

    override toString(): string {
        return `${this.name.replace(' ', '')}(${this.size},${this.#status},${this.#alignment})`;
    }
}

export type NotFoundShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = ShipModel & ValueObject & {
    status: OpponentShipStatus.NOT_FOUND;
    alignment: undefined;

    markAsNonVerifiedSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): UnverifiedSunkShip<ColumnIndex, RowIndex>;
    markAsSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): SunkShip<ColumnIndex, RowIndex>;
};

export function isNotFoundShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(value: unknown): value is NotFoundShip<ColumnIndex, RowIndex> {
    return value instanceof OpponentShip && value.status === OpponentShipStatus.NOT_FOUND;
}

export type UnverifiedSunkShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = ShipModel & ValueObject & {
    status: OpponentShipStatus.NON_VERIFIED_SUNK;
    alignment: CoordinateAlignment<ColumnIndex, RowIndex>;

    markAsNotFound(): NotFoundShip<ColumnIndex, RowIndex>;
    markAsSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): SunkShip<ColumnIndex, RowIndex>;
};

export function isUnverifiedSunkShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(value: unknown): value is UnverifiedSunkShip<ColumnIndex, RowIndex> {
    return value instanceof OpponentShip && value.status === OpponentShipStatus.NON_VERIFIED_SUNK;
}

export type SunkShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = ShipModel & ValueObject & {
    status: OpponentShipStatus.SUNK;
    alignment: CoordinateAlignment<ColumnIndex, RowIndex>;
};

export function isSunkShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(value: unknown): value is SunkShip<ColumnIndex, RowIndex> {
    return value instanceof OpponentShip && value.status === OpponentShipStatus.SUNK;
}

export type Ship<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = NotFoundShip<ColumnIndex, RowIndex> | SunkShip<ColumnIndex, RowIndex> | UnverifiedSunkShip<ColumnIndex, RowIndex>;

export function isShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(value: unknown): value is Ship<ColumnIndex, RowIndex> {
    return value instanceof OpponentShip;
}

export function createOpponentShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(ship: ShipModel): NotFoundShip<ColumnIndex, RowIndex> {
    const opponentShip = new OpponentShip<ColumnIndex, RowIndex>(
        ship.name,
        ship.size,
    );

    assert(isNotFoundShip(opponentShip));

    return opponentShip;
}

class InvalidAlignmentSize extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'InvalidAlignmentSize';
    }

    static forShip(
        ship: OpponentShip<any, any>,
        alignment: CoordinateAlignment<any, any>,
    ): InvalidAlignmentSize {
        return new InvalidAlignmentSize(
            `Expected alignment ${alignment.toString()} to match the ship size ${ship.toString()}.`,
        );
    }
}
