import { expect } from 'chai';
import { List, Set } from 'immutable';
import { toString } from 'lodash';
import { Coordinate } from '../../src/grid/coordinate';
import { ShipDirection } from '../../src/ship/ship-direction';
import { ShipSize } from '../../src/ship/ship-size';
import { TestCoordinate, testCoordinateNavigator } from './test-coordinates';

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

type TestAlignment = {
    readonly direction: ShipDirection,
    readonly coordinates: List<string>,
};

class CoordinateAlignmentsSet {
    constructor(
        readonly title: string,
        readonly coordinates: List<TestCoordinate>,
        readonly maxDistance: ShipSize,
        readonly expected: ReadonlyArray<TestAlignment>,
    ) {
    }
}

function* provideCoordinateAlignmentsSet(): Generator<CoordinateAlignmentsSet> {
    yield new CoordinateAlignmentsSet(
        'single coordinate: no alignment possible',
        List([new Coordinate('C', '3')]),
        2,
        [],
    );
}

describe('CoordinateNavigator::findAlignments()', () => {
    for (const { title, coordinates, maxDistance, expected } of provideCoordinateAlignmentsSet()) {
        it(title, () => {
            console.log({
                set: Set([new Coordinate('A', '1'), new Coordinate('A', '1')])
                    .toArray()
                    .map(toString),
            });

            const actual = testCoordinateNavigator
                .findAlignments(coordinates, maxDistance)
                .map(({ direction, coordinates: alignedCoordinates }) => ({
                    direction,
                    coordinates: alignedCoordinates.map(toString).toArray(),
                }))
                .toArray()
                .sort();

            expect(actual).to.eqls(expected);
        });
    }
});
