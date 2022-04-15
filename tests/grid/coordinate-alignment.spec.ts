import { expect } from 'chai';
import { isValueObject, List } from 'immutable';
import { toString } from 'lodash';
import { Coordinate } from '../../src/grid/coordinate';
import {
    AtomicAlignment, CoordinateAlignment, RemovedNextExtremum,
} from '../../src/grid/coordinate-alignment';
import { ShipDirection } from '../../src/ship/ship-direction';
import { expectLeftValueError, rightValue } from '../utils/either-expectations';
import {
    TestCoordinate, TestCoordinateAlignment, testCoordinateNavigator,
} from './test-coordinates';

class ToStringSet {
    constructor(
        readonly title: string,
        readonly alignment: TestCoordinateAlignment,
        readonly expected: string,
    ) {
    }
}

function* provideToStringSet(): Generator<ToStringSet> {
    yield new ToStringSet(
        'with extremums',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '3'),
                new Coordinate('C', '3'),
            ]),
            List([]),
            new Coordinate('A', '3'),
            new Coordinate('D', '3'),
        ),
        'HORIZONTAL:]B3,C3[',
    );

    yield new ToStringSet(
        'with no left extremum',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '3'),
                new Coordinate('C', '3'),
            ]),
            List([]),
            undefined,
            new Coordinate('D', '3'),
        ),
        'HORIZONTAL:[B3,C3[',
    );

    yield new ToStringSet(
        'with left removed',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '3'),
                new Coordinate('C', '3'),
            ]),
            List([]),
            RemovedNextExtremum,
            new Coordinate('D', '3'),
        ),
        'HORIZONTAL:[B3,C3[',
    );

    yield new ToStringSet(
        'with no right extremum',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '3'),
                new Coordinate('C', '3'),
            ]),
            List([]),
            new Coordinate('A', '3'),
            undefined,
        ),
        'HORIZONTAL:]B3,C3]',
    );

    yield new ToStringSet(
        'with no right extremum',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '3'),
                new Coordinate('C', '3'),
            ]),
            List([]),
            new Coordinate('A', '3'),
            RemovedNextExtremum,
        ),
        'HORIZONTAL:]B3,C3]',
    );
}

class EqualitySet {
    constructor(
        readonly title: string,
        readonly left: TestCoordinateAlignment,
        readonly right: TestCoordinateAlignment,
        readonly expected: boolean,
    ) {
    }
}

function* provideEqualitySets(): Generator<EqualitySet> {
    const alignment = new CoordinateAlignment(
        testCoordinateNavigator,
        ShipDirection.HORIZONTAL,
        List([
            new Coordinate('A', '4'),
            new Coordinate('B', '4'),
        ]),
        List([]),
        undefined,
        undefined,
    );

    yield new EqualitySet(
        'same object',
        alignment,
        alignment,
        true,
    );

    yield new EqualitySet(
        'same sortedCoordinates but different references',
        alignment,
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        ),
        true,
    );

    yield new EqualitySet(
        'different sortedCoordinates',
        alignment,
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('A', '5'),
            ]),
            List([]),
            undefined,
            undefined,
        ),
        false,
    );
}

class NextExtremumRemoval {
    constructor(
        readonly title: string,
        readonly alignment: TestCoordinateAlignment,
        readonly extremum: TestCoordinate,
        readonly expected: TestCoordinateAlignment,
    ) {
    }
}

function* provideNextExtremumRemoval(): Generator<NextExtremumRemoval> {
    yield new NextExtremumRemoval(
        'no extremum',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        ),
        new Coordinate('A', '4'),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        ),
    );

    yield new NextExtremumRemoval(
        'remove next head',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            new Coordinate('A', '4'),
            new Coordinate('D', '4'),
        ),
        new Coordinate('B', '4'),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            RemovedNextExtremum,
            new Coordinate('D', '4'),
        ),
    );

    yield new NextExtremumRemoval(
        'remove next tail',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            new Coordinate('A', '4'),
            new Coordinate('D', '4'),
        ),
        new Coordinate('C', '4'),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            new Coordinate('A', '4'),
            RemovedNextExtremum,
        ),
    );
}

class ExtremumRemoval {
    constructor(
        readonly title: string,
        readonly alignment: TestCoordinateAlignment,
        readonly shift: TestCoordinateAlignment | string,
        readonly pop: TestCoordinateAlignment | string,
    ) {
    }
}

function* provideExtremumRemoval(): Generator<ExtremumRemoval> {
    yield new ExtremumRemoval(
        'atomic',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        ),
        'The alignment HORIZONTAL:[A4,B4] is atomic: no element can be removed from it.',
        'The alignment HORIZONTAL:[A4,B4] is atomic: no element can be removed from it.',
    );

    yield new ExtremumRemoval(
        '3 elements',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
                new Coordinate('D', '4'),
            ]),
            List([]),
            new Coordinate('A', '4'),
            new Coordinate('E', '4'),
        ),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('C', '4'),
                new Coordinate('D', '4'),
            ]),
            List([]),
            new Coordinate('B', '4'),
            new Coordinate('E', '4'),
        ),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            new Coordinate('A', '4'),
            new Coordinate('D', '4'),
        ),
    );

    yield new ExtremumRemoval(
        '3 elements with extremums removed',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
                new Coordinate('D', '4'),
            ]),
            List([]),
            RemovedNextExtremum,
            RemovedNextExtremum,
        ),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('C', '4'),
                new Coordinate('D', '4'),
            ]),
            List([]),
            new Coordinate('B', '4'),
            RemovedNextExtremum,
        ),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            RemovedNextExtremum,
            new Coordinate('D', '4'),
        ),
    );

    yield new ExtremumRemoval(
        '4 elements and a gap',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('D', '4'),
                new Coordinate('E', '4'),
            ]),
            List([
                new Coordinate('C', '4'),
            ]),
            undefined,
            undefined,
        ),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('D', '4'),
                new Coordinate('E', '4'),
            ]),
            List([
                new Coordinate('C', '4'),
            ]),
            new Coordinate('A', '4'),
            undefined,
        ),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('D', '4'),
            ]),
            List([
                new Coordinate('C', '4'),
            ]),
            undefined,
            new Coordinate('E', '4'),
        ),
    );

    yield new ExtremumRemoval(
        '3 elements and a gap',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('E', '4'),
            ]),
            List([
                new Coordinate('C', '4'),
                new Coordinate('D', '4'),
            ]),
            undefined,
            undefined,
        ),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('B', '4'),
                new Coordinate('E', '4'),
            ]),
            List([
                new Coordinate('C', '4'),
                new Coordinate('D', '4'),
            ]),
            new Coordinate('A', '4'),
            undefined,
        ),
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List(),
            undefined,
            new Coordinate('C', '4'),
        ),
    );
}

class ContainsAnyCoordinateSet {
    constructor(
        readonly title: string,
        readonly alignment: TestCoordinateAlignment,
        readonly coordinates: List<TestCoordinate>,
        readonly expected: boolean,
    ) {
    }
}

function* provideContainsAnyCoordinateSet(): Generator<ContainsAnyCoordinateSet> {
    const alignment: TestCoordinateAlignment = new CoordinateAlignment(
        testCoordinateNavigator,
        ShipDirection.HORIZONTAL,
        List([
            new Coordinate('A', '4'),
            new Coordinate('B', '4'),
            new Coordinate('D', '4'),
        ]),
        List([]),
        undefined,
        undefined,
    );

    yield new ContainsAnyCoordinateSet(
        'no coordinates belong to the alignment',
        alignment,
        List([
            new Coordinate('A', '2'),
            new Coordinate('B', '2'),
            new Coordinate('D', '2'),
        ]),
        false,
    );

    yield new ContainsAnyCoordinateSet(
        'one coordinate belong to the alignment',
        alignment,
        List([
            new Coordinate('A', '2'),
            new Coordinate('B', '4'),
            new Coordinate('D', '2'),
        ]),
        true,
    );

    yield new ContainsAnyCoordinateSet(
        'all coordinates belong to the alignment',
        alignment,
        List([
            new Coordinate('A', '4'),
            new Coordinate('B', '4'),
            new Coordinate('D', '4'),
        ]),
        true,
    );
}

function normalizeAlignment(alignment: TestCoordinateAlignment): object {
    return {
        direction: alignment.direction,
        sortedCoordinates: alignment.sortedCoordinates.map(toString).toArray(),
        sortedGaps: alignment.sortedGaps.map(toString).toArray(),
        extremums: alignment.extremums.map(toString).toArray(),
        nextHead: alignment.nextHead?.toString(),
        nextTail: alignment.nextTail?.toString(),
        nextExtremums: alignment.nextExtremums.map(toString).toArray(),
    };
}

function expectEqualAlignments(
    actual: TestCoordinateAlignment,
    expected: TestCoordinateAlignment,
): void {
    // This is purely to trigger the lazy evaluation of the string value
    expect(actual.toString()).to.equal(expected.toString());

    expect(normalizeAlignment(actual)).to.eqls(normalizeAlignment(expected));
}

describe('Coordinate', () => {
    for (const { title, alignment, expected } of provideToStringSet()) {
        it(`can be cast into a string: ${title}`, () => {
            expect(alignment.toString()).to.equal(expected);
        });
    }

    // This allows Immutable JS to correctly detect duplicates
    it('is an Immutable value object', () => {
        const alignment = new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        );

        expect(isValueObject(alignment)).to.equal(true);
    });

    for (const { title, left, right, expected } of provideEqualitySets()) {
        it(title, () => {
            expect(left.equals(right)).to.equal(expected);

            if (expected) {
                expect(left.hashCode()).to.equal(right.hashCode());
            } else {
                expect(left.hashCode()).to.not.equal(right.hashCode());
            }
        });
    }

    it('can tell if it contains a coordinate or not', () => {
        const alignment: TestCoordinateAlignment = new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        );

        expect(alignment.contains(new Coordinate('A', '4'))).to.equal(true);
        expect(alignment.contains(new Coordinate('D', '4'))).to.equal(false);
    });

    for (const { title, alignment, coordinates, expected } of provideContainsAnyCoordinateSet()) {
        it(`can tell if it contains any of the coordinates or not: ${title}`, () => {
            const actual = alignment.containsAny(coordinates);

            expect(actual).to.eqls(expected);
        });
    }

    it('describes its head & tail', () => {
        const alignment: TestCoordinateAlignment = new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        );

        expect(alignment.head.toString()).to.equal('A4');
        expect(alignment.tail.toString()).to.equal('C4');
    });

    for (const { title, alignment, extremum, expected } of provideNextExtremumRemoval()) {
        it(`can remove an extremum: ${title}`, () => {
            const original = alignment.toString();

            const actual = alignment.removeNextExtremum(extremum);

            // Ensure toString is calculated (it is lazily evaluated) as
            // otherwise the comparator may fail.
            alignment.toString();
            expected.toString();

            rightValue(
                actual,
                (value) => {
                    expect(value.toString()).to.eqls(expected.toString());
                    expect(value).to.eqls(expected);
                },
            );
            expect(alignment.toString()).to.equal(original);
        });
    }

    it('cannot remove an invalid extremum', () => {
        const alignment: TestCoordinateAlignment = new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            undefined,
            undefined,
        );

        const actual = alignment.removeNextExtremum(
            new Coordinate('A', '1'),
        );

        expectLeftValueError(
            'InvalidExtremum',
            'The coordinate A1 is not an extremum of the alignment HORIZONTAL:[A4,B4,C4].',
            actual,
        );
    });

    for (const { title, alignment, shift, pop } of provideExtremumRemoval()) {
        it(`can shift the alignment: ${title}`, () => {
            const original = alignment.toString();

            const result = alignment.shift();

            if ('string' === typeof shift) {
                expectLeftValueError(
                    'AtomicAlignment',
                    shift,
                    result,
                );
            } else {
                rightValue(
                    result,
                    (actual) => {
                        expectEqualAlignments(actual, shift);
                        expect(alignment.toString()).to.equal(original);
                    }
                );
            }
        });

        it(`can pop the alignment: ${title}`, () => {
            const original = alignment.toString();

            const result = alignment.pop();

            if ('string' === typeof pop) {
                expectLeftValueError(
                    'AtomicAlignment',
                    pop,
                    result,
                );
            } else {
                rightValue(
                    result,
                    (actual) => {
                        expectEqualAlignments(actual, pop);
                        expect(alignment.toString()).to.equal(original);
                    }
                );
            }
        });
    }

    it('can add an next extremum to the alignment', () => {
        const alignment: TestCoordinateAlignment = new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            undefined,
            new Coordinate('D', '4'),
        );

        const newAlignment = alignment.add(
            new Coordinate('D', '4'),
        );

        const expected = new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
                new Coordinate('D', '4'),
            ]),
            List([]),
            undefined,
            new Coordinate('E', '4'),
        );

        rightValue(
            newAlignment,
            (value) => expectEqualAlignments(value, expected),
        );
    });

    it('cannot add an non-extremum to the alignment', () => {
        const alignment: TestCoordinateAlignment = new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            undefined,
            new Coordinate('D', '4'),
        );

        const actual = alignment.add(
            new Coordinate('E', '5'),
        );

        expectLeftValueError(
            'InvalidExtremum',
            'The coordinate E5 is not a next extremum of the alignment HORIZONTAL:[A4,B4,C4[.',
            actual,
        );
    });

    it('cannot add an valid extremum to the alignment for which the extremum has been removed', () => {
        const alignment: TestCoordinateAlignment = new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.HORIZONTAL,
            List([
                new Coordinate('A', '4'),
                new Coordinate('B', '4'),
                new Coordinate('C', '4'),
            ]),
            List([]),
            undefined,
            RemovedNextExtremum,
        );

        const actual = alignment.add(
            new Coordinate('D', '4'),
        );

        expectLeftValueError(
            'InvalidExtremum',
            'The coordinate D4 is not a next extremum of the alignment HORIZONTAL:[A4,B4,C4].',
            actual,
        );
    });
});
