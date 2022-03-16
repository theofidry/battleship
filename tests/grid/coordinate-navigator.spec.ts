import { expect } from 'chai';
import { List, Set } from 'immutable';
import { toString } from 'lodash';
import { Coordinate } from '../../src/grid/coordinate';
import { CoordinateAlignment, NonAlignedCoordinates } from '../../src/grid/coordinate-navigator';
import { ShipDirection } from '../../src/ship/ship-direction';
import { ShipSize } from '../../src/ship/ship-size';
import { expectError } from '../chai-assertions';
import {
    TestColumnIndex, TestCoordinate, testCoordinateNavigator, TestRowIndex,
} from './test-coordinates';
import assert = require('node:assert');

class SurroundingCoordinatesSet {
    constructor(
        readonly title: string,
        readonly target: TestCoordinate,
        readonly expected: ReadonlyArray<string>
    ) {
    }
}

function* provideSurroundingCoordinatesSet(): Generator<SurroundingCoordinatesSet> {
    yield new SurroundingCoordinatesSet(
        'origin in the middle of the grid',
        new Coordinate('C', '3'),
        ['C2', 'C4', 'B3', 'D3'].sort(),
    );

    yield new SurroundingCoordinatesSet(
        'origin in a corner of the grid',
        new Coordinate('A', '1'),
        ['A2', 'B1'].sort(),
    );
}

describe('CoordinateNavigator::getSurroundingCoordinates()', () => {
    for (const { title, target, expected } of provideSurroundingCoordinatesSet()) {
        it(title, () => {
            const actual = testCoordinateNavigator
                .getSurroundingCoordinates(target)
                .map((coordinate) => coordinate.toString())
                .sort();

            expect(actual).to.eqls(expected);
        });
    }
});

class DistanceSet {
    constructor(
        readonly title: string,
        readonly first: TestCoordinate,
        readonly second: TestCoordinate,
        readonly expected: NonAlignedCoordinates | number,
    ) {
    }
}

function* provideDistanceSet(): Generator<DistanceSet> {
    yield new DistanceSet(
        'two identical coordinates',
        new Coordinate('C', '3'),
        new Coordinate('C', '3'),
        0,
    );

    yield new DistanceSet(
        'two adjacent coordinates (vertical)',
        new Coordinate('C', '3'),
        new Coordinate('C', '4'),
        1,
    );

    yield new DistanceSet(
        'two aligned coordinates (vertical)',
        new Coordinate('C', '2'),
        new Coordinate('C', '5'),
        3,
    );

    yield new DistanceSet(
        'two adjacent coordinates (horizontal)',
        new Coordinate('C', '3'),
        new Coordinate('D', '3'),
        1,
    );

    yield new DistanceSet(
        'two aligned coordinates (horizontal)',
        new Coordinate('B', '2'),
        new Coordinate('E', '2'),
        3,
    );

    yield new DistanceSet(
        'two diagonally aligned coordinates',
        new Coordinate('C', '2'),
        new Coordinate('D', '3'),
        new NonAlignedCoordinates('The coordinates "C2" and "D3" are not aligned.'),
    );
}

describe('CoordinateNavigator::calculateDistance()', () => {
    for (const { title, first, second, expected } of provideDistanceSet()) {
        it(title, () => {
            testCoordinateNavigator.calculateDistance(first, second)
                .fold(
                    (error) => {
                        expect(expected).to.be.instanceof(NonAlignedCoordinates);
                        assert(expected instanceof NonAlignedCoordinates);

                        expectError(
                            'NonAlignedCoordinates',
                            expected.message,
                            () => {
                                throw error;
                            },
                        );
                    },
                    (distance) => {
                        expect(expected).to.not.be.instanceof(NonAlignedCoordinates);
                        assert(Number.isInteger(expected));

                        expect(distance).to.equal(expected);
                    }
                );
        });
    }
});

type TestAlignment = {
    readonly direction: ShipDirection,
    readonly coordinates: ReadonlyArray<string>,
};

class CoordinateAlignmentsSet {
    constructor(
        readonly title: string,
        readonly coordinates: Set<TestCoordinate>,
        readonly maxDistance: ShipSize,
        readonly expected: ReadonlyArray<TestAlignment>,
    ) {
    }
}

function* provideCoordinateAlignmentsSet(): Generator<CoordinateAlignmentsSet> {
    yield new CoordinateAlignmentsSet(
        'single coordinate: no alignment possible',
        Set([new Coordinate('C', '3')]),
        2,
        [].sort(),
    );

    yield new CoordinateAlignmentsSet(
        'two adjacent coordinates',
        Set([
            new Coordinate('C', '3'),
            new Coordinate('C', '2'),
        ]),
        2,
        [
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C2', 'C3'].sort(),
            },
        ],
    );

    yield new CoordinateAlignmentsSet(
        'two aligned coordinates at the border of maximum distance',
        Set([
            new Coordinate('C', '3'),
            new Coordinate('C', '1'),
        ]),
        2,
        [
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C1', 'C3'].sort(),
            },
        ],
    );

    yield new CoordinateAlignmentsSet(
        'two aligned (horizontally) coordinates',
        Set([
            new Coordinate('C', '3'),
            new Coordinate('E', '3'),
        ]),
        2,
        [
            {
                direction: ShipDirection.HORIZONTAL,
                coordinates: ['C3', 'E3'].sort(),
            },
        ],
    );

    yield new CoordinateAlignmentsSet(
        'two aligned coordinates more distant that the maximum distance',
        Set([
            new Coordinate('C', '4'),
            new Coordinate('C', '1'),
        ]),
        2,
        [].sort(),
    );

    yield new CoordinateAlignmentsSet(
        'coordinate with multiple alignments of different directions',
        Set([
            new Coordinate('C', '3'),
            new Coordinate('C', '5'),
            new Coordinate('D', '3'),
        ]),
        2,
        [
            {
                direction: ShipDirection.HORIZONTAL,
                coordinates: ['C3', 'D3'].sort(),
            },
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C3', 'C5'].sort(),
            },
        ],
    );

    yield new CoordinateAlignmentsSet(
        'multiple aligned coordinates with some out of reach',
        Set([
            new Coordinate('C', '1'),
            new Coordinate('C', '2'),
            new Coordinate('C', '3'),
            new Coordinate('C', '4'),
            new Coordinate('C', '5'),
        ]),
        2,
        [
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C1', 'C2', 'C3'].sort(),
            },
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C2', 'C3', 'C4'].sort(),
            },
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C3', 'C4', 'C5'].sort(),
            },
        ],
    );
}

describe('CoordinateNavigator::findAlignments()', () => {
    for (const { title, coordinates, maxDistance, expected } of provideCoordinateAlignmentsSet()) {
        it(title, () => {
            const actual = testCoordinateNavigator
                .findAlignments(coordinates, maxDistance)
                .map(({ direction, coordinates: alignedCoordinates }) => ({
                    direction,
                    coordinates: alignedCoordinates.map(toString).toArray().sort(),
                }))
                .toArray();

            expect(actual).to.eqls(expected);
        });
    }
});

class CoordinateAlignmentGapsSet {
    constructor(
        readonly title: string,
        readonly alignment: CoordinateAlignment<TestColumnIndex, TestRowIndex>,
        readonly expected: ReadonlyArray<string>,
    ) {
    }
}

function* provideCoordinateAlignmentGapsSet(): Generator<CoordinateAlignmentGapsSet> {
    yield new CoordinateAlignmentGapsSet(
        'alignment with no coordinates',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List(),
        },
        [].sort()
    );

    yield new CoordinateAlignmentGapsSet(
        'alignment with one coordinate',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
            ]),
        },
        [].sort()
    );

    yield new CoordinateAlignmentGapsSet(
        'alignment with two adjacent coordinates',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '3'),
            ]),
        },
        [].sort()
    );

    yield new CoordinateAlignmentGapsSet(
        'alignment with two separated coordinates',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '4'),
            ]),
        },
        ['B3'].sort()
    );

    yield new CoordinateAlignmentGapsSet(
        'alignment with two separated coordinates (inversed order)',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '4'),
                new Coordinate('B', '2'),
            ]),
        },
        ['B3'].sort()
    );

    yield new CoordinateAlignmentGapsSet(
        'alignment with two separated coordinates (horizontally)',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('D', '2'),
            ]),
        },
        ['C2'].sort()
    );

    yield new CoordinateAlignmentGapsSet(
        'alignment with two separated coordinates (x2)',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '5'),
            ]),
        },
        ['B3', 'B4'].sort()
    );

    yield new CoordinateAlignmentGapsSet(
        'alignment with multi-gaps',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '1'),
                new Coordinate('B', '3'),
                new Coordinate('B', '5'),
            ]),
        },
        ['B2', 'B4'].sort()
    );
}

describe('CoordinateNavigator::findAlignmentGaps()', () => {
    for (const { title, alignment, expected } of provideCoordinateAlignmentGapsSet()) {
        it(title, () => {
            const actual = testCoordinateNavigator
                .findAlignmentGaps(alignment)
                .map(toString)
                .toArray()
                .sort();

            expect(actual).to.eqls(expected);
        });
    }
});
