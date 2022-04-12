import { assert } from '../../assert/assert';
import { CoordinateAlignment } from '../../grid/coordinate-alignment';
import { Ship as ShipModel } from '../../ship/ship';

export enum OpponentShipStatus {
    NOT_FOUND = 'NOT_FOUND',
    UNVERIFIED_SUNK = 'UNVERIFIED_SUNK',
    SUNK = 'SUNK',
}

class OpponentShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> extends ShipModel {
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

    markAsUnverifiedSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): UnverifiedSunkShip<ColumnIndex, RowIndex> {
        const previous = this;
        assert(
            isShip(previous) && !isSunkShip(previous),
            () => `Cannot un-verify a sunk ship. Tried to mark ${this.toString()} as unverified sunk.`,
        );

        const ship = this.createWith(
            OpponentShipStatus.UNVERIFIED_SUNK,
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

        const ship = this.createWith(
            OpponentShipStatus.SUNK,
            alignment,
        );

        assert(isSunkShip(ship));

        return ship;
    }

    override toString(): string {
        return `${this.name}(${this.#status},${this.#alignment})`;
    }
}

export type NotFoundShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = ShipModel & {
    status: OpponentShipStatus.NOT_FOUND;
    alignment: undefined;

    markAsUnverifiedSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): UnverifiedSunkShip<ColumnIndex, RowIndex>;
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
> = ShipModel & {
    status: OpponentShipStatus.UNVERIFIED_SUNK;
    alignment: CoordinateAlignment<ColumnIndex, RowIndex>;

    markAsNotFound(): NotFoundShip<ColumnIndex, RowIndex>;
    markAsSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): SunkShip<ColumnIndex, RowIndex>;
};

export function isUnverifiedSunkShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(value: unknown): value is UnverifiedSunkShip<ColumnIndex, RowIndex> {
    return value instanceof OpponentShip && value.status === OpponentShipStatus.UNVERIFIED_SUNK;
}

export type SunkShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = ShipModel & {
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
