import { expect } from 'chai';
import { List, Set } from 'immutable';
import { toString } from 'lodash';
import heredoc from 'tsheredoc';
import { Coordinate } from '../../src/grid/coordinate';
import {
    CoordinateAlignment, createIndices, findNextIndexByStep, LoopableIndices, NonAlignedCoordinates,
    VerticalTraverseDirection,
} from '../../src/grid/coordinate-navigator';
import { printGrid } from '../../src/grid/grid-printer';
import { ShipDirection } from '../../src/ship/ship-direction';
import { ShipSize } from '../../src/ship/ship-size';
import { expectError } from '../chai-assertions';
import {
    createEmptyGrid, TEST_COLUMN_INDICES, TestCell, testCellPrinter, TestColumnIndex,
    TestCoordinate, testCoordinateNavigator, TestRowIndex,
} from './test-coordinates';
import assert = require('node:assert');

class SortCoordinatesSet {
    constructor(
        readonly title: string,
        readonly left: TestCoordinate,
        readonly right: TestCoordinate,
        readonly expected: ReadonlyArray<string>,
    ) {
    }
}

function* provideSortCoordinatesSet(): Generator<SortCoordinatesSet> {
    yield new SortCoordinatesSet(
        'same coordinate',
        new Coordinate('C', '3'),
        new Coordinate('C', '3'),
        ['C3', 'C3'],
    );

    yield new SortCoordinatesSet(
        'left has same row but its column is more on the right',
        new Coordinate('E', '3'),
        new Coordinate('C', '3'),
        ['C3', 'E3'],
    );

    yield new SortCoordinatesSet(
        'left has same column but its row is more on the right',
        new Coordinate('C', '5'),
        new Coordinate('C', '3'),
        ['C3', 'C5'],
    );

    yield new SortCoordinatesSet(
        'nominal',
        new Coordinate('D', '3'),
        new Coordinate('B', '2'),
        ['B2', 'D3'],
    );

    yield new SortCoordinatesSet(
        'nominal (2)',
        new Coordinate('C', '2'),
        new Coordinate('B', '3'),
        ['C2', 'B3'],
    );
}

describe('CoordinateNavigator::sortCoordinates()', () => {
    for (const { title, left, right, expected } of provideSortCoordinatesSet()) {
        it(title, () => {
            const actual = [left, right]
                .sort(testCoordinateNavigator.createCoordinatesSorter())
                .map(toString);

            expect(actual).to.eqls(expected);
        });
    }
});

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
        ['C2', 'B3', 'D3', 'C4'],
    );

    yield new SurroundingCoordinatesSet(
        'origin in a corner of the grid',
        new Coordinate('A', '1'),
        ['B1', 'A2'],
    );
}

describe('CoordinateNavigator::getSurroundingCoordinates()', () => {
    for (const { title, target, expected } of provideSurroundingCoordinatesSet()) {
        it(title, () => {
            const actual = testCoordinateNavigator
                .getSurroundingCoordinates(target)
                .map((coordinate) => coordinate.toString());

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

    yield new CoordinateAlignmentsSet(
        'unordered aligned coordinates with some out of reach',
        Set([
            new Coordinate('C', '2'),
            new Coordinate('C', '4'),
            new Coordinate('C', '1'),
            new Coordinate('C', '5'),
            new Coordinate('C', '3'),
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

class CoordinateAlignmentSet {
    constructor(
        readonly title: string,
        readonly alignment: CoordinateAlignment<TestColumnIndex, TestRowIndex>,
        readonly expectedGaps: ReadonlyArray<string>,
        readonly expectedExtremums: ReadonlyArray<string>,
    ) {
    }
}

function* provideCoordinateAlignmentGapsSet(): Generator<CoordinateAlignmentSet> {
    yield new CoordinateAlignmentSet(
        'alignment with no coordinates',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List(),
        },
        [],
        [],
    );

    yield new CoordinateAlignmentSet(
        'alignment with one coordinate',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
            ]),
        },
        [],
        ['A2', 'C2'],
    );

    yield new CoordinateAlignmentSet(
        'alignment with one coordinate in a corner',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('A', '2'),
            ]),
        },
        [],
        ['B2'],
    );

    yield new CoordinateAlignmentSet(
        'alignment with two adjacent coordinates',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '3'),
            ]),
        },
        [],
        ['B1', 'B4'],
    );

    yield new CoordinateAlignmentSet(
        'alignment with two separated coordinates',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '4'),
            ]),
        },
        ['B3'],
        ['B1', 'B5'],
    );

    yield new CoordinateAlignmentSet(
        'alignment with two separated coordinates with incorrect direction',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '4'),
            ]),
        },
        [],
        ['A2', 'C2'],
    );

    yield new CoordinateAlignmentSet(
        'alignment with two separated coordinates (inverse order)',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '4'),
                new Coordinate('B', '2'),
            ]),
        },
        ['B3'],
        ['B1', 'B5'],
    );

    yield new CoordinateAlignmentSet(
        'alignment with two separated coordinates (horizontally)',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('D', '2'),
            ]),
        },
        ['C2'],
        ['A2', 'E2'],
    );

    yield new CoordinateAlignmentSet(
        'alignment with two separated coordinates (x2)',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '5'),
            ]),
        },
        ['B3', 'B4'],
        ['B1'],
    );

    yield new CoordinateAlignmentSet(
        'alignment with multi-gaps',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '1'),
                new Coordinate('B', '3'),
                new Coordinate('B', '5'),
            ]),
        },
        ['B2', 'B4'],
        [],
    );
}

describe('CoordinateNavigator::findAlignmentGaps()', () => {
    for (const { title, alignment, expectedGaps } of provideCoordinateAlignmentGapsSet()) {
        it(title, () => {
            const actual = testCoordinateNavigator
                .findAlignmentGaps(alignment)
                .map(toString)
                .toArray();

            expect(actual).to.eqls(expectedGaps);
        });
    }
});

describe('CoordinateNavigator::findNextExtremums()', () => {
    for (const { title, alignment, expectedExtremums } of provideCoordinateAlignmentGapsSet()) {
        it(title, () => {
            const actual = testCoordinateNavigator
                .findNextExtremums(alignment)
                .map(toString)
                .toArray();

            expect(actual).to.eqls(expectedExtremums);
        });
    }
});

describe('CoordinateNavigator::findGridOrigin()', () => {
    it('can find the grid origin for a traverse from top left to bottom right', () => {
        const actual = testCoordinateNavigator
            .findGridOrigin(VerticalTraverseDirection.TOP_TO_BOTTOM);

        expect(actual).to.not.equal(undefined);
        expect(actual.toString()).to.eqls('A1');
    });

    it('can find the grid origin for a traverse from bottom left to top right', () => {
        const actual = testCoordinateNavigator
            .findGridOrigin(VerticalTraverseDirection.BOTTOM_TO_TOP);

        expect(actual).to.not.equal(undefined);
        expect(actual.toString()).to.eqls('A5');
    });
});

describe('CoordinateNavigator\'s findNextIndexByStep()', () => {
    it('can find the next index by a step', () => {
        const actual = findNextIndexByStep(
            testCoordinateNavigator.findNextColumnIndex,
            'B',
            2,
        );

        expect(actual).to.equal('D');
    });

    it('can find the next index by a step (out of bound)', () => {
        const actual = findNextIndexByStep(
            testCoordinateNavigator.findNextColumnIndex,
            'E',
            2,
        );

        expect(actual).to.equal(undefined);
    });
});

describe('CoordinateNavigator\'s createIndices()', () => {
    it('can create indices', () => {
        const indices = createIndices(
            'B',
            testCoordinateNavigator.findNextColumnIndex,
        );

        const expected = [
            // No 'A' since we start at 'B'
            'B',
            'C',
            'D',
            'E',
        ];

        expect(indices.toArray()).to.eqls(expected);
    });
});

class FindStartingCoordinateSet {
    constructor(
        readonly title: string,
        readonly direction: VerticalTraverseDirection,
        readonly minShipSize: ShipSize,
        readonly expected: Array<string>,
    ) {
    }
}

function* provideFindStartingCoordinateSet(): Generator<FindStartingCoordinateSet> {
    yield new FindStartingCoordinateSet(
        'case 1',
        VerticalTraverseDirection.TOP_TO_BOTTOM,
        2,
        ['A1', 'A2'],
    );

    yield new FindStartingCoordinateSet(
        'case 2',
        VerticalTraverseDirection.TOP_TO_BOTTOM,
        3,
        ['A1', 'A2', 'A3'],
    );

    yield new FindStartingCoordinateSet(
        'case 3',
        VerticalTraverseDirection.TOP_TO_BOTTOM,
        4,
        ['A1', 'A2', 'A3', 'A4'],
    );

    yield new FindStartingCoordinateSet(
        'case 4',
        VerticalTraverseDirection.BOTTOM_TO_TOP,
        2,
        ['A4', 'A5'],
    );

    yield new FindStartingCoordinateSet(
        'case 5',
        VerticalTraverseDirection.BOTTOM_TO_TOP,
        3,
        ['A3', 'A4', 'A5'],
    );

    yield new FindStartingCoordinateSet(
        'case 6',
        VerticalTraverseDirection.BOTTOM_TO_TOP,
        4,
        ['A2', 'A3', 'A4', 'A5'],
    );
}

describe('CoordinateNavigator::findStartingCoordinates()', () => {
    for (const { title, direction, minShipSize, expected } of provideFindStartingCoordinateSet()) {
        it(`can get the starting coordinates ${title}`, () => {
            const actual = testCoordinateNavigator.findStartingCoordinates(
                    direction,
                    minShipSize,
                )
                .map(toString)
                .toArray();

            expect(actual).to.eqls(expected);
        });
    }
});

describe('CoordinateNavigator\'s LoopableIndices', () => {
    it('has loopable indices', () => {
        const loopableIndices = new LoopableIndices(
            List(TEST_COLUMN_INDICES),
            'B',
        );

        const expectedIndices = [
            'B',
            'C',
            'D',
            'E',
            'A',
            // Repeat loop!
            'B',
            'C',
            'D',
            'E',
        ];

        expectedIndices.forEach((expected) => {
            const actual = loopableIndices.getNextIndex();

            expect(actual).to.equal(expected);
        });
    });
});

const createMarkedGrid = (markedCoordinatesList: List<List<Coordinate<TestColumnIndex, TestRowIndex>>>): ReadonlyArray<string> => {
    return markedCoordinatesList
        .map((markedCoordinates) => {
            const grid = createEmptyGrid().fillCells(
                markedCoordinates.toArray(),
                TestCell.FULL,
                () => true,
            );

            return printGrid(grid.getRows(), testCellPrinter);
        })
        .sort()
        .toArray();
};

describe('CoordinateNavigator::search()', () => {
    it('can screen the grid for when the smallest ship searched is of size 2', () => {
        const paths = createMarkedGrid(testCoordinateNavigator.traverseGrid(2));

        const expected = [
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 1 │ 0 │ 1 │ 0 │ 1 │
            │    2    │ 0 │ 1 │ 0 │ 1 │ 0 │
            │    3    │ 1 │ 0 │ 1 │ 0 │ 1 │
            │    4    │ 0 │ 1 │ 0 │ 1 │ 0 │
            │    5    │ 1 │ 0 │ 1 │ 0 │ 1 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 1 │ 0 │ 1 │ 0 │
            │    2    │ 1 │ 0 │ 1 │ 0 │ 1 │
            │    3    │ 0 │ 1 │ 0 │ 1 │ 0 │
            │    4    │ 1 │ 0 │ 1 │ 0 │ 1 │
            │    5    │ 0 │ 1 │ 0 │ 1 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 1 │ 0 │ 1 │ 0 │ 1 │
            // │    2    │ 0 │ 1 │ 0 │ 1 │ 0 │
            // │    3    │ 1 │ 0 │ 1 │ 0 │ 1 │
            // │    4    │ 0 │ 1 │ 0 │ 1 │ 0 │
            // │    5    │ 1 │ 0 │ 1 │ 0 │ 1 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 0 │ 1 │ 0 │ 1 │ 0 │
            // │    2    │ 1 │ 0 │ 1 │ 0 │ 1 │
            // │    3    │ 0 │ 1 │ 0 │ 1 │ 0 │
            // │    4    │ 1 │ 0 │ 1 │ 0 │ 1 │
            // │    5    │ 0 │ 1 │ 0 │ 1 │ 0 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
        ];

        expect(paths).to.eqls(expected.sort());
    });

    it('can screen the grid for when the smallest ship searched is of size 3', () => {
        const paths = createMarkedGrid(testCoordinateNavigator.traverseGrid(3));

        const expected = [
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    2    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    3    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    4    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    5    │ 0 │ 1 │ 0 │ 0 │ 1 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    2    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    3    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    4    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    5    │ 1 │ 0 │ 0 │ 1 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    2    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    3    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    4    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    5    │ 0 │ 0 │ 1 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 0 │ 1 │ 0 │ 0 │ 1 │
            // │    2    │ 1 │ 0 │ 0 │ 1 │ 0 │
            // │    3    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // │    4    │ 0 │ 1 │ 0 │ 0 │ 1 │
            // │    5    │ 1 │ 0 │ 0 │ 1 │ 0 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 1 │ 0 │ 0 │ 1 │ 0 │
            // │    2    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // │    3    │ 0 │ 1 │ 0 │ 0 │ 1 │
            // │    4    │ 1 │ 0 │ 0 │ 1 │ 0 │
            // │    5    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // │    2    │ 0 │ 1 │ 0 │ 0 │ 1 │
            // │    3    │ 1 │ 0 │ 0 │ 1 │ 0 │
            // │    4    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // │    5    │ 0 │ 1 │ 0 │ 0 │ 1 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
        ];

        expect(paths).to.eqls(expected.sort());
    });

    it('can screen the grid for when the smallest ship searched is of size 4', () => {
        const paths = createMarkedGrid(testCoordinateNavigator.traverseGrid(4));

        const expected = [
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 1 │ 0 │ 0 │ 0 │ 1 │
            │    2    │ 0 │ 1 │ 0 │ 0 │ 0 │
            │    3    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    4    │ 0 │ 0 │ 0 │ 1 │ 0 │
            │    5    │ 1 │ 0 │ 0 │ 0 │ 1 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 0 │ 1 │ 0 │
            │    2    │ 1 │ 0 │ 0 │ 0 │ 1 │
            │    3    │ 0 │ 1 │ 0 │ 0 │ 0 │
            │    4    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    5    │ 0 │ 0 │ 0 │ 1 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    2    │ 0 │ 0 │ 0 │ 1 │ 0 │
            │    3    │ 1 │ 0 │ 0 │ 0 │ 1 │
            │    4    │ 0 │ 1 │ 0 │ 0 │ 0 │
            │    5    │ 0 │ 0 │ 1 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 1 │ 0 │ 0 │ 0 │
            │    2    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    3    │ 0 │ 0 │ 0 │ 1 │ 0 │
            │    4    │ 1 │ 0 │ 0 │ 0 │ 1 │
            │    5    │ 0 │ 1 │ 0 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 1 │ 0 │ 0 │ 0 │ 1 │
            // │    2    │ 0 │ 0 │ 0 │ 1 │ 0 │
            // │    3    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // │    4    │ 0 │ 1 │ 0 │ 0 │ 0 │
            // │    5    │ 1 │ 0 │ 0 │ 0 │ 1 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 0 │ 0 │ 0 │ 1 │ 0 │
            // │    2    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // │    3    │ 0 │ 1 │ 0 │ 0 │ 0 │
            // │    4    │ 1 │ 0 │ 0 │ 0 │ 1 │
            // │    5    │ 0 │ 0 │ 0 │ 1 │ 0 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // │    2    │ 0 │ 1 │ 0 │ 0 │ 0 │
            // │    3    │ 1 │ 0 │ 0 │ 0 │ 1 │
            // │    4    │ 0 │ 0 │ 0 │ 1 │ 0 │
            // │    5    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
            // heredoc(`
            // ┌─────────┬───┬───┬───┬───┬───┐
            // │ (index) │ A │ B │ C │ D │ E │
            // ├─────────┼───┼───┼───┼───┼───┤
            // │    1    │ 0 │ 1 │ 0 │ 0 │ 0 │
            // │    2    │ 1 │ 0 │ 0 │ 0 │ 1 │
            // │    3    │ 0 │ 0 │ 0 │ 1 │ 0 │
            // │    4    │ 0 │ 0 │ 1 │ 0 │ 0 │
            // │    5    │ 0 │ 1 │ 0 │ 0 │ 0 │
            // └─────────┴───┴───┴───┴───┴───┘
            // `),
        ];

        expect(paths).to.eqls(expected.sort());
    });
});
