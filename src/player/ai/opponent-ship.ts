import { assert } from '../../assert/assert';
import { assertIsNotUndefined } from '../../assert/assert-is-not-undefined';
import { CoordinateAlignment } from '../../grid/coordinate-alignment';
import { ShipSize } from '../../ship/ship-size';

export enum OpponentShipStatus {
    NOT_FOUND = 'NOT_FOUND',
    POTENTIALLY_SUNK = 'POTENTIALLY_SUNK',
    SUNK = 'SUNK',
}

export class OpponentShip<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    #alignment: CoordinateAlignment<ColumnIndex, RowIndex> | undefined = undefined;
    #status = OpponentShipStatus.NOT_FOUND;

    constructor(
        public readonly size: ShipSize,
    ) {
    }

    get status(): OpponentShipStatus {
        return this.#status;
    }

    get alignment(): CoordinateAlignment<ColumnIndex, RowIndex> | undefined {
        return this.#alignment;
    }

    unmarkAsPotentiallySunk(): CoordinateAlignment<ColumnIndex, RowIndex> {
        assert(this.#status === OpponentShipStatus.POTENTIALLY_SUNK);

        this.#status = OpponentShipStatus.NOT_FOUND;

        const alignment = this.#alignment;
        assertIsNotUndefined(alignment);

        return alignment;
    }

    markAsPotentiallySunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const previousStatus = this.#status;

        assert(previousStatus !== OpponentShipStatus.SUNK);

        this.#status = OpponentShipStatus.POTENTIALLY_SUNK;
        this.#alignment = alignment;
    }

    markAsSunk(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): void {
        const previousStatus = this.#status;

        assert(previousStatus !== OpponentShipStatus.SUNK);

        this.#status = OpponentShipStatus.SUNK;
        this.#alignment = alignment;
    }

    toString(): string {
        return `"${this.#status},${this.#alignment}"`;
    }
}
