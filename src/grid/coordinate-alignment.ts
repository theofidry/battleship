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
    public readonly nextExtremums: List<Coordinate<ColumnIndex, RowIndex>>;

    private stringValue?: string;

    public constructor(
        public readonly direction: ShipDirection,
        public readonly sortedCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
        public readonly sortedGaps: List<Coordinate<ColumnIndex, RowIndex>>,
        public readonly nextHead: Coordinate<ColumnIndex, RowIndex> | undefined,
        public readonly nextTail: Coordinate<ColumnIndex, RowIndex> | undefined,
    ) {
        assert(
            sortedCoordinates.size >= 2,
            `Expected alignment to contain at least 2 elements. Got "${sortedCoordinates.size}".`,
        );

        this.nextExtremums = List([nextHead, nextTail].filter(isNotUndefined));
    }

    head(): Coordinate<ColumnIndex, RowIndex> {
        return this.sortedCoordinates.first()!;
    }

    tail(): Coordinate<ColumnIndex, RowIndex> {
        return this.sortedCoordinates.last()!;
    }

    pop(): CoordinateAlignment<ColumnIndex, RowIndex> {
        const tail = this.tail();
        const newSortedCoordinates = this.sortedCoordinates.pop();
        assert(newSortedCoordinates.size >= 2, 'TODO: prob Either<>');

        return new CoordinateAlignment(
            this.direction,
            newSortedCoordinates,
            this.sortedGaps, // TODO: may be incorrect
            this.nextHead,
            tail,
        );
    }

    shift(): CoordinateAlignment<ColumnIndex, RowIndex> {
        const head = this.head();
        const newSortedCoordinates = this.sortedCoordinates.shift();
        assert(newSortedCoordinates.size >= 2, 'TODO: prob Either<>');

        return new CoordinateAlignment(
            this.direction,
            newSortedCoordinates,
            this.sortedGaps, // TODO: may be incorrect
            head,
            this.nextTail,
        );
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

    removeNextExtremum(extremum: Coordinate<ColumnIndex, RowIndex>): CoordinateAlignment<ColumnIndex, RowIndex> {
        const { direction, sortedCoordinates, sortedGaps } = this;
        let { nextHead, nextTail } = this;

        const head = sortedCoordinates.first()!;

        if (head.equals(extremum)) {
            nextHead = undefined;
        } else {
            const tail = sortedCoordinates.last()!;

            // Sanity check
            assert(tail.equals(extremum));

            nextTail = undefined;
        }

        return new CoordinateAlignment(
            direction,
            sortedCoordinates,
            sortedGaps,
            nextHead,
            nextTail,
        );
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

export function isAlignmentWithNoGap<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): boolean {
    return alignment.sortedGaps.size === 0;
}
