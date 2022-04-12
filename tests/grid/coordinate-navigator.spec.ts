import { assert, expect } from 'chai';
import { List, Set } from 'immutable';
import { toString } from 'lodash';
import heredoc from 'tsheredoc';
import { Coordinate } from '../../src/grid/coordinate';
import { CoordinateAlignment } from '../../src/grid/coordinate-alignment';
import {
    createIndices, findNextIndexByStep, IncompleteCoordinateAlignment, LoopableIndices,
    NonAlignedCoordinates,
} from '../../src/grid/coordinate-navigator';
import { printGrid } from '../../src/grid/grid-printer';
import { ShipDirection } from '../../src/ship/ship-direction';
import { ShipSize } from '../../src/ship/ship-size';
import { expectError } from '../chai-assertions';
import {
    createEmptyGrid, TEST_COLUMN_INDICES, TestCell, testCellPrinter, TestColumnIndex,
    TestCoordinate, testCoordinateNavigator, TestRowIndex,
} from './test-coordinates';

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
                .map((coordinate) => coordinate.toString())
                .toArray();

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
        'two identical sortedCoordinates',
        new Coordinate('C', '3'),
        new Coordinate('C', '3'),
        0,
    );

    yield new DistanceSet(
        'two adjacent sortedCoordinates (vertical)',
        new Coordinate('C', '3'),
        new Coordinate('C', '4'),
        1,
    );

    yield new DistanceSet(
        'two aligned sortedCoordinates (vertical)',
        new Coordinate('C', '2'),
        new Coordinate('C', '5'),
        3,
    );

    yield new DistanceSet(
        'two adjacent sortedCoordinates (horizontal)',
        new Coordinate('C', '3'),
        new Coordinate('D', '3'),
        1,
    );

    yield new DistanceSet(
        'two aligned sortedCoordinates (horizontal)',
        new Coordinate('B', '2'),
        new Coordinate('E', '2'),
        3,
    );

    yield new DistanceSet(
        'two diagonally aligned sortedCoordinates',
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

                        expectError(
                            'NonAlignedCoordinates',
                            (expected as NonAlignedCoordinates).message,
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
        'single coordinate: no #alignment possible',
        Set([new Coordinate('C', '3')]),
        2,
        [].sort(),
    );

    yield new CoordinateAlignmentsSet(
        'two adjacent sortedCoordinates',
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
        'two aligned sortedCoordinates at the border of maximum distance (maxDistance=2)',
        Set([
            new Coordinate('C', '2'),
            new Coordinate('C', '1'),
        ]),
        2,
        [
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C1', 'C2'].sort(),
            },
        ],
    );

    yield new CoordinateAlignmentsSet(
        'two aligned sortedCoordinates at the border of maximum distance (maxDistance=3)',
        Set([
            new Coordinate('C', '3'),
            new Coordinate('C', '1'),
        ]),
        3,
        [
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C1', 'C3'].sort(),
            },
        ],
    );

    yield new CoordinateAlignmentsSet(
        'two aligned (horizontally) sortedCoordinates',
        Set([
            new Coordinate('C', '3'),
            new Coordinate('D', '3'),
        ]),
        2,
        [
            {
                direction: ShipDirection.HORIZONTAL,
                coordinates: ['C3', 'D3'].sort(),
            },
        ],
    );

    yield new CoordinateAlignmentsSet(
        'two aligned sortedCoordinates more distant that the maximum distance (maxDistance=2)',
        Set([
            new Coordinate('C', '3'),
            new Coordinate('C', '1'),
        ]),
        2,
        [].sort(),
    );

    yield new CoordinateAlignmentsSet(
        'two aligned sortedCoordinates more distant that the maximum distance (maxDistance=3)',
        Set([
            new Coordinate('C', '4'),
            new Coordinate('C', '1'),
        ]),
        3,
        [].sort(),
    );

    yield new CoordinateAlignmentsSet(
        'coordinate with multiple alignments of different directions',
        Set([
            new Coordinate('C', '3'),
            new Coordinate('C', '5'),
            new Coordinate('D', '3'),
        ]),
        3,
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
        'multiple aligned sortedCoordinates with some out of reach (maxDistance=2)',
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
                coordinates: ['C1', 'C2'].sort(),
            },
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C2', 'C3'].sort(),
            },
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C3', 'C4'].sort(),
            },
            {
                direction: ShipDirection.VERTICAL,
                coordinates: ['C4', 'C5'].sort(),
            },
        ],
    );

    yield new CoordinateAlignmentsSet(
        'multiple aligned sortedCoordinates with some out of reach (maxDistance=3)',
        Set([
            new Coordinate('C', '1'),
            new Coordinate('C', '2'),
            new Coordinate('C', '3'),
            new Coordinate('C', '4'),
            new Coordinate('C', '5'),
        ]),
        3,
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
        'unordered aligned sortedCoordinates with some out of reach',
        Set([
            new Coordinate('C', '2'),
            new Coordinate('C', '4'),
            new Coordinate('C', '1'),
            new Coordinate('C', '5'),
            new Coordinate('C', '3'),
        ]),
        3,
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

describe('CoordinateNavigator::findAlignedCoordinates()', () => {
    for (const { title, coordinates, maxDistance, expected } of provideCoordinateAlignmentsSet()) {
        it(title, () => {
            const actual = testCoordinateNavigator
                .findAlignedCoordinates(coordinates, maxDistance)
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
        readonly alignment: IncompleteCoordinateAlignment<TestColumnIndex, TestRowIndex>,
        readonly expectedGaps: ReadonlyArray<string>,
        readonly expectedNextHead: string | undefined,
        readonly expectedNextTail: string | undefined,
    ) {
    }
}

function* provideCoordinateAlignmentGapsSet(): Generator<CoordinateAlignmentSet> {
    yield new CoordinateAlignmentSet(
        '#alignment with no sortedCoordinates',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List(),
        },
        [],
        undefined,
        undefined,
    );

    yield new CoordinateAlignmentSet(
        '#alignment with one coordinate',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
            ]),
        },
        [],
        'A2',
        'C2',
    );

    yield new CoordinateAlignmentSet(
        '#alignment with one coordinate in a corner',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('A', '2'),
            ]),
        },
        [],
        undefined,
        'B2',
    );

    yield new CoordinateAlignmentSet(
        '#alignment with two adjacent sortedCoordinates',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '3'),
            ]),
        },
        [],
        'B1',
        'B4',
    );

    yield new CoordinateAlignmentSet(
        '#alignment with two separated sortedCoordinates',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '4'),
            ]),
        },
        ['B3'],
        'B1',
        'B5',
    );

    yield new CoordinateAlignmentSet(
        '#alignment with two separated sortedCoordinates with incorrect direction',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '4'),
            ]),
        },
        [],
        'A2',
        'C2',
    );

    yield new CoordinateAlignmentSet(
        '#alignment with two separated sortedCoordinates (inverse order)',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '4'),
                new Coordinate('B', '2'),
            ]),
        },
        ['B3'],
        'B1',
        'B5',
    );

    yield new CoordinateAlignmentSet(
        '#alignment with two separated sortedCoordinates (horizontally)',
        {
            direction: ShipDirection.HORIZONTAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('D', '2'),
            ]),
        },
        ['C2'],
        'A2',
        'E2',
    );

    yield new CoordinateAlignmentSet(
        '#alignment with two separated sortedCoordinates (x2)',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '2'),
                new Coordinate('B', '5'),
            ]),
        },
        ['B3', 'B4'],
        'B1',
        undefined,
    );

    yield new CoordinateAlignmentSet(
        '#alignment with multi-gaps',
        {
            direction: ShipDirection.VERTICAL,
            coordinates: List([
                new Coordinate('B', '1'),
                new Coordinate('B', '3'),
                new Coordinate('B', '5'),
            ]),
        },
        ['B2', 'B4'],
        undefined,
        undefined,
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
    for (const { title, alignment, expectedNextHead, expectedNextTail } of provideCoordinateAlignmentGapsSet()) {
        it(title, () => {
            const { nextHead, nextTail } = testCoordinateNavigator.findNextExtremums(alignment);

            expect(nextHead?.toString()).to.equal(expectedNextHead);
            expect(nextTail?.toString()).to.equal(expectedNextTail);
        });
    }
});

class CoordinateAlignmentExplodeGapsSet {
    constructor(
        readonly title: string,
        readonly alignment: CoordinateAlignment<TestColumnIndex, TestRowIndex>,
        readonly expectedAlignments: ReadonlyArray<string>,
    ) {
    }
}

function* provideCoordinateAlignmentExplodeGapsSet(): Generator<CoordinateAlignmentExplodeGapsSet> {
    yield new CoordinateAlignmentExplodeGapsSet(
        '#alignment with no gaps',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.VERTICAL,
            List([
                new Coordinate('A', '1'),
                new Coordinate('A', '2'),
                new Coordinate('A', '3'),
                new Coordinate('A', '4'),
            ]),
            List(),
            undefined,
            new Coordinate('A', '5'),
        ),
        [
            'VERTICAL:(A1,A2,A3,A4)',
        ],
    );

    yield new CoordinateAlignmentExplodeGapsSet(
        '#alignment with one gap',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.VERTICAL,
            List([
                new Coordinate('A', '1'),
                new Coordinate('A', '2'),
                new Coordinate('A', '4'),
                new Coordinate('A', '5'),
            ]),
            List(),
            undefined,
            undefined,
        ),
        [
            'VERTICAL:(A1,A2)',
            'VERTICAL:(A4,A5)',
        ],
    );

    yield new CoordinateAlignmentExplodeGapsSet(
        '#alignment with two gaps',
        new CoordinateAlignment(
            testCoordinateNavigator,
            ShipDirection.VERTICAL,
            List([
                new Coordinate('A', '1'),
                new Coordinate('A', '2'),
                new Coordinate('A', '3'),
                new Coordinate('A', '5'),
            ]),
            List(),
            undefined,
            undefined,
        ),
        [
            'VERTICAL:(A1,A2,A3)',
        ],
    );
}

describe('CoordinateNavigator::explodeByGaps()', () => {
    for (const { title, alignment, expectedAlignments } of provideCoordinateAlignmentExplodeGapsSet()) {
        it(title, () => {
            const actual = testCoordinateNavigator
                .explodeByGaps(alignment)
                .map(toString)
                .toArray();

            expect(actual).to.eqls(expectedAlignments);
        });
    }
});

describe('CoordinateNavigator::getGridOrigin()', () => {
    it('can find the grid origin', () => {
        const actual = testCoordinateNavigator.getGridOrigin();

        expect(actual.toString()).to.eqls('A1');
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
        readonly minShipSize: ShipSize,
        readonly expected: Array<string>,
    ) {
    }
}

function* provideFindStartingCoordinateSet(): Generator<FindStartingCoordinateSet> {
    yield new FindStartingCoordinateSet(
        'case 1',
        2,
        ['A1', 'A2'],
    );

    yield new FindStartingCoordinateSet(
        'case 2',
        3,
        ['A1', 'A2', 'A3'],
    );

    yield new FindStartingCoordinateSet(
        'case 3',
        4,
        ['A1', 'A2', 'A3', 'A4'],
    );
}

describe('CoordinateNavigator::findStartingCoordinates()', () => {
    for (const { title, minShipSize, expected } of provideFindStartingCoordinateSet()) {
        it(`can get the starting coordinates ${title}`, () => {
            const actual = testCoordinateNavigator.findStartingCoordinates(minShipSize)
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
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    2    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    3    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    4    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    5    │ 1 │ 0 │ 0 │ 1 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    2    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    3    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    4    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    5    │ 0 │ 0 │ 1 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    2    │ 0 │ 1 │ 0 │ 0 │ 1 │
            │    3    │ 1 │ 0 │ 0 │ 1 │ 0 │
            │    4    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    5    │ 0 │ 1 │ 0 │ 0 │ 1 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
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
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 1 │ 0 │ 0 │ 0 │ 1 │
            │    2    │ 0 │ 0 │ 0 │ 1 │ 0 │
            │    3    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    4    │ 0 │ 1 │ 0 │ 0 │ 0 │
            │    5    │ 1 │ 0 │ 0 │ 0 │ 1 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 0 │ 1 │ 0 │
            │    2    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    3    │ 0 │ 1 │ 0 │ 0 │ 0 │
            │    4    │ 1 │ 0 │ 0 │ 0 │ 1 │
            │    5    │ 0 │ 0 │ 0 │ 1 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    2    │ 0 │ 1 │ 0 │ 0 │ 0 │
            │    3    │ 1 │ 0 │ 0 │ 0 │ 1 │
            │    4    │ 0 │ 0 │ 0 │ 1 │ 0 │
            │    5    │ 0 │ 0 │ 1 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
            heredoc(`
            ┌─────────┬───┬───┬───┬───┬───┐
            │ (index) │ A │ B │ C │ D │ E │
            ├─────────┼───┼───┼───┼───┼───┤
            │    1    │ 0 │ 1 │ 0 │ 0 │ 0 │
            │    2    │ 1 │ 0 │ 0 │ 0 │ 1 │
            │    3    │ 0 │ 0 │ 0 │ 1 │ 0 │
            │    4    │ 0 │ 0 │ 1 │ 0 │ 0 │
            │    5    │ 0 │ 1 │ 0 │ 0 │ 0 │
            └─────────┴───┴───┴───┴───┴───┘
            `),
        ];

        expect(paths).to.eqls(expected.sort());
    });
});
