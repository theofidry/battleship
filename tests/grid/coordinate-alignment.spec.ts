import { expect } from 'chai';
import { isValueObject, List } from 'immutable';
import { toString } from 'lodash';
import { Coordinate } from '../../src/grid/coordinate';
import { AtomicAlignment, CoordinateAlignment } from '../../src/grid/coordinate-alignment';
import { ShipDirection } from '../../src/ship/ship-direction';
import { expectLeftValueError, rightValue } from '../utils/either-expectations';
import {
    TestCoordinate, TestCoordinateAlignment, testCoordinateNavigator,
} from './test-coordinates';

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
            undefined,
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
            undefined,
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
        'The #alignment HORIZONTAL:(A4,B4) is atomic: no element can be removed from it.',
        'The #alignment HORIZONTAL:(A4,B4) is atomic: no element can be removed from it.',
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

function convertAlignment(alignment: TestCoordinateAlignment): object {
    return {
        direction: alignment.direction,
        sortedCoordinates: alignment.sortedCoordinates.map(toString).toArray(),
        sortedGaps: alignment.sortedGaps.map(toString).toArray(),
        nextHead: alignment.nextHead?.toString(),
        nextTail: alignment.nextTail?.toString(),
        nextExtremums: alignment.nextExtremums.map(toString).toArray(),
    };
}

describe('Coordinate', () => {
    it('can be cast into a string', () => {
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

        const expected = 'HORIZONTAL:(A4,B4)';

        expect(alignment.toString()).to.equal(expected);
    });

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

            expect(actual).to.eqls(expected);
            expect(alignment.toString()).to.equal(original);
        });
    }

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
                        expect(convertAlignment(actual)).to.eqls(convertAlignment(shift));
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
                        expect(convertAlignment(actual)).to.eqls(convertAlignment(pop));
                        expect(alignment.toString()).to.equal(original);
                    }
                );
            }
        });
    }
});
