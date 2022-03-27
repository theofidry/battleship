import { List, ValueObject } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../assert/assert';
import { isNotUndefined } from '../assert/assert-is-not-undefined';
import { ShipDirection } from '../ship/ship-direction';
import { Coordinate } from './coordinate';
import { hashString } from './string-hash-code';

export class CoordinateAlignment<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> implements ValueObject {
    public readonly extremums: List<Coordinate<ColumnIndex, RowIndex>>;

    private stringValue?: string;

    public constructor(
        public readonly direction: ShipDirection,
        public readonly sortedCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
        public readonly sortedGaps: List<Coordinate<ColumnIndex, RowIndex>>,
        public readonly head: Coordinate<ColumnIndex, RowIndex> | undefined,
        public readonly tail: Coordinate<ColumnIndex, RowIndex> | undefined,
    ) {
        assert(
            sortedCoordinates.size >= 2,
            `Expected alignment to contain at least 2 elements. Got "${sortedCoordinates.size}".`,
        );

        this.extremums = List([head, tail].filter(isNotUndefined));
    }

    first(): Coordinate<ColumnIndex, RowIndex> {
        return this.sortedCoordinates.first()!;
    }

    contains(coordinate: Coordinate<ColumnIndex, RowIndex>): boolean {
        return this.sortedCoordinates.includes(coordinate);
    }

    equals(other: unknown): boolean {
        return other instanceof CoordinateAlignment
            && this.toString() === other.toString();
    }

    hashCode(): number {
        return hashString(this.toString());
    }

    toString(): string {
        let { stringValue } = this;

        if (undefined !== stringValue) {
            return stringValue;
        }

        const { direction, sortedCoordinates } = this;
        const formattedCoordinates = sortedCoordinates.map(toString).join(',');

        stringValue = `${direction}:(${formattedCoordinates})`;
        this.stringValue = stringValue;

        return stringValue;
    }
}
