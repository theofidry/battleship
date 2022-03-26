import { expect } from 'chai';
import { createFleet, Fleet } from '../../src/ship/fleet';
import { calculateEfficiency } from '../../src/standard-grid/efficiency';

class EfficiencySet {
    constructor(
        readonly title: string,
        readonly fleet: Fleet,
        readonly lastTurn: number,
        readonly expected: number,
    ) {
    }
}

function* provideEfficiencySet(): Generator<EfficiencySet> {
    yield new EfficiencySet(
        'nominal',
        createFleet(),
        110,
        53,
    );

    yield new EfficiencySet(
        'max turn',
        createFleet(),
        100 + 99,
        0,
    );

    yield new EfficiencySet(
        'mid',
        createFleet(),
        115,
        50,
    );

    yield new EfficiencySet(
        'non-integer',
        createFleet(),
        123.59,
        45,
    );

    yield new EfficiencySet(
        'min turn',
        createFleet(),
        17 + 16,
        100,
    );
}

describe('Efficiency', () => {
    for (const { title, fleet, lastTurn, expected } of provideEfficiencySet()) {
        it(`can calculate the efficiency: ${title}`, () => {
            const actual = calculateEfficiency(fleet, lastTurn);

            expect(actual).to.equal(expected);
        });
    }
});
