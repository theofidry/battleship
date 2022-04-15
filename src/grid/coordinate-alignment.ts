import { List, ValueObject } from 'immutable';
import { toString } from 'lodash';
import { assert } from '../assert/assert';
import { isNotUndefined } from '../assert/assert-is-not-undefined';
import { ShipDirection } from '../ship/ship-direction';
import { isShipSize, ShipSize } from '../ship/ship-size';
import { Either } from '../utils/either';
import { Coordinate } from './coordinate';
import { CoordinateNavigator, IncompleteCoordinateAlignment } from './coordinate-navigator';
import { hashString } from './string-hash-code';

export function completeAlignment<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    alignment: IncompleteCoordinateAlignment<ColumnIndex, RowIndex>,
    coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
): CoordinateAlignment<ColumnIndex, RowIndex> {
    const { nextHead, nextTail } = coordinateNavigator.findNextExtremums(alignment);

    return new CoordinateAlignment(
        coordinateNavigator,
        alignment.direction,
        alignment.coordinates,
        coordinateNavigator.findAlignmentGaps(alignment),
        nextHead,
        nextTail,
    );
}

function recreateFromPreviousAlignment<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    newSortedCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
    previous: CoordinateAlignment<ColumnIndex, RowIndex>,
    coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
): CoordinateAlignment<ColumnIndex, RowIndex> {
    const incompleteAlignment = {
        direction: previous.direction,
        coordinates: newSortedCoordinates,
    };

    const nextExtremums = coordinateNavigator.findNextExtremums(incompleteAlignment);

    const nextHead = newSortedCoordinates.contains(previous.head)
        ? previous.nextHead
        : nextExtremums.nextHead;

    const nextTail = newSortedCoordinates.contains(previous.tail)
        ? previous.nextTail
        : nextExtremums.nextTail;

    return new CoordinateAlignment(
        coordinateNavigator,
        previous.direction,
        newSortedCoordinates,
        coordinateNavigator.findAlignmentGaps(incompleteAlignment),
        nextHead,
        nextTail,
    );
}

export const RemovedNextExtremum = Symbol('RemovedNextExtremum');

export class CoordinateAlignment<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> implements ValueObject {
    public readonly extremums: List<Coordinate<ColumnIndex, RowIndex>>;
    public readonly nextExtremums: List<Coordinate<ColumnIndex, RowIndex>>;

    private stringValue?: string;

    public constructor(
        private readonly coordinateNavigator: CoordinateNavigator<ColumnIndex, RowIndex>,
        public readonly direction: ShipDirection,
        public readonly sortedCoordinates: List<Coordinate<ColumnIndex, RowIndex>>,
        public readonly sortedGaps: List<Coordinate<ColumnIndex, RowIndex>>,
        public readonly nextHead: Coordinate<ColumnIndex, RowIndex> | typeof RemovedNextExtremum | undefined,
        public readonly nextTail: Coordinate<ColumnIndex, RowIndex> | typeof RemovedNextExtremum | undefined,
    ) {
        assert(
            sortedCoordinates.size >= 2,
            `Expected alignment to contain at least 2 elements. Got "${sortedCoordinates.size}".`,
        );

        this.extremums = List([this.head, this.tail].filter(isNotUndefined));
        this.nextExtremums = List([nextHead, nextTail].filter(
            (value): value is Coordinate<ColumnIndex, RowIndex> => value instanceof Coordinate),
        );
    }

    get head(): Coordinate<ColumnIndex, RowIndex> {
        return this.sortedCoordinates.first()!;
    }

    get tail(): Coordinate<ColumnIndex, RowIndex> {
        return this.sortedCoordinates.last()!;
    }

    contains(coordinate: Coordinate<ColumnIndex, RowIndex>): boolean {
        return this.sortedCoordinates.includes(coordinate);
    }

    containsAny(coordinates: List<Coordinate<ColumnIndex, RowIndex>>): boolean {
        return coordinates.some(
            (coordinate) => this.contains(coordinate),
        );
    }

    equals(other: unknown): boolean {
        return other instanceof CoordinateAlignment
            && this.toString() === other.toString();
    }

    hashCode(): number {
        return hashString(this.toString());
    }

    removeNextExtremum(extremum: Coordinate<ColumnIndex, RowIndex>): CoordinateAlignment<ColumnIndex, RowIndex> {
        const { extremums, head, tail } = this;

        assert(
            extremums.contains(extremum),
            () => InvalidExtremum.forAlignment(this, extremum),
        );

        let { nextHead, nextTail } = this;

        if (head.equals(extremum) && nextHead !== undefined) {
            nextHead = RemovedNextExtremum;
        } else if (tail.equals(extremum) && nextTail !== undefined) {
            nextTail = RemovedNextExtremum;
        } else {
            return this;
        }

        return new CoordinateAlignment(
            this.coordinateNavigator,
            this.direction,
            this.sortedCoordinates,
            this.sortedGaps,
            nextHead,
            nextTail,
        );
    }

    shift(): Either<AtomicAlignment, CoordinateAlignment<ColumnIndex, RowIndex>> {
        const newSortedCoordinates = this.sortedCoordinates.shift();

        if (newSortedCoordinates.size < 2) {
            return Either.left(AtomicAlignment.forAlignment(this));
        }

        return Either.right(
            recreateFromPreviousAlignment(
                newSortedCoordinates,
                this,
                this.coordinateNavigator,
            ),
        );
    }

    pop(): Either<AtomicAlignment, CoordinateAlignment<ColumnIndex, RowIndex>> {
        const newSortedCoordinates = this.sortedCoordinates.pop();

        if (newSortedCoordinates.size < 2) {
            return Either.left(AtomicAlignment.forAlignment(this));
        }

        return Either.right(
            recreateFromPreviousAlignment(
                newSortedCoordinates,
                this,
                this.coordinateNavigator,
            ),
        );
    }

    toString(): string {
        let { stringValue } = this;

        if (undefined !== stringValue) {
            return stringValue;
        }

        const { direction, sortedCoordinates, nextHead, nextTail } = this;
        const formattedCoordinates = sortedCoordinates.map(toString).join(',');

        const leftSide = nextHead instanceof Coordinate ? ']' : '[';
        const rightSide = nextTail instanceof Coordinate ? '[' : ']';

        stringValue = `${direction}:${leftSide}${formattedCoordinates}${rightSide}`;
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

export type PotentialShipAlignment<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    readonly alignment: CoordinateAlignment<ColumnIndex, RowIndex>;
    readonly alignmentSize: ShipSize;
};

export function verifyAlignment<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(alignment: CoordinateAlignment<ColumnIndex, RowIndex>): Either<Error, PotentialShipAlignment<ColumnIndex, RowIndex>> {
    const size = alignment.sortedCoordinates.size;

    return isAlignmentWithNoGap(alignment) && isShipSize(size)
        ? Either.right({ alignment, alignmentSize: size })
        : Either.left(new Error(`The alignment ${alignment.toString()} cannot be a ship alignment.`));

}

export class AtomicAlignment extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'AtomicAlignment';
    }

    static forAlignment(alignment: CoordinateAlignment<any, any>): AtomicAlignment {
        return new AtomicAlignment(`The alignment ${alignment.toString()} is atomic: no element can be removed from it.`);
    }
}


export class InvalidExtremum extends Error {
    constructor(message?: string) {
        super(message);

        this.name = 'InvalidExtremum';
    }

    static forAlignment(
        alignment: CoordinateAlignment<any, any>,
        extremum: Coordinate<any, any>,
    ): AtomicAlignment {
        return new AtomicAlignment(`The alignment ${alignment.toString()} is atomic: no element can be removed from it.`);
    }
}
