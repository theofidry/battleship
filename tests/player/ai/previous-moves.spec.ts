import { expect } from 'chai';
import { List } from 'immutable';
import { toString } from 'lodash';
import { HitResponse } from '../../../src/communication/hit-response';
import { Coordinate } from '../../../src/grid/coordinate';
import { PreviousMoves } from '../../../src/player/ai/previous-moves';
import { TestColumnIndex, TestCoordinate, TestRowIndex } from '../../grid/test-coordinates';

type TestPreviousMoves = PreviousMoves<TestColumnIndex, TestRowIndex>;

function normalizeCoordinateList(coordinates: List<TestCoordinate>): ReadonlyArray<string> {
    return coordinates.toArray().map(toString);
}

function expectLastMoveToBe(
    previousMoves: TestPreviousMoves,
    expectedLast: string | undefined,
): void {
    expect(previousMoves.last?.target.toString()).to.equal(expectedLast);
}

function expectPreviousMovesState(
    previousMoves: TestPreviousMoves,
    expectedAll: ReadonlyArray<string>,
    expectedSunkCoordinates: ReadonlyArray<string>,
    expectedHitCoordinates: ReadonlyArray<string>,
    expectedLast: string | undefined,
): void {
    expect(normalizeCoordinateList(previousMoves.all.map(({ target }) => target))).to.eqls(expectedAll);
    expect(normalizeCoordinateList(previousMoves.sunkCoordinates)).to.eqls(expectedSunkCoordinates);
    expect(normalizeCoordinateList(previousMoves.hitCoordinates)).to.eqls(expectedHitCoordinates);
    expectLastMoveToBe(previousMoves, expectedLast);
}

describe('PreviousMoves', () => {
    it('is initially empty', () => {
        const previousMoves: TestPreviousMoves = new PreviousMoves();

        expectPreviousMovesState(
            previousMoves,
            [],
            [],
            [],
            undefined,
        );

        expect(previousMoves.contains(new Coordinate('A', '2'))).to.equal(false);
    });

    it('records moves', () => {
        const previousMoves: TestPreviousMoves = new PreviousMoves();

        previousMoves.push({
            response: HitResponse.MISS,
            target: new Coordinate('A', '2'),
        });
        previousMoves.push({
            response: HitResponse.HIT,
            target: new Coordinate('A', '3'),
        });
        previousMoves.push({
            response: HitResponse.HIT,
            target: new Coordinate('A', '4'),
        });
        previousMoves.push({
            response: HitResponse.SUNK,
            target: new Coordinate('A', '5'),
        });

        expectPreviousMovesState(
            previousMoves,
            ['A2', 'A3', 'A4', 'A5'],
            ['A5'],
            ['A3', 'A4'],
            'A5',
        );

        expect(previousMoves.contains(new Coordinate('A', '1'))).to.equal(false);
        expect(previousMoves.contains(new Coordinate('A', '2'))).to.equal(true);
    });
});
