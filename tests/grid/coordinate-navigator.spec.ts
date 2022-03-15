import { expect } from 'chai';
import { Coordinate } from '../../src/grid/coordinate';
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
