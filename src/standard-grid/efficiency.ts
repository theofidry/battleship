import { assert } from '../assert/assert';
import { Fleet } from '../ship/fleet';
import { MAX_TURN } from './std-coordinate';

/**
 * Calculates the match efficiency, i.e. how performant the winner has been.
 * The closer to reach the maximum number of turns, the worst the performance
 * is hence the closer to 0 the efficiency is.
 *
 * @param {number} lastTurn Last turn (integer belonging to ]1;MAX_TURN[.
 *
 * @return number Integer member of [0;100]
 */
export function calculateEfficiency(fleet: Fleet, lastTurn: number): number {
    assertIsFleetSize(fleet);
    assertIsValidTurn(lastTurn);

    const fleetSize = fleet.reduce((sum, { size }) => sum + size, 0);

    const min = fleetSize * 2 - 1; // Minimum amount of turns it takes to end the game
    const max = MAX_TURN - 1;      // Maximum amount of turns it takes to end the game

    const maxDistance = max - min;
    const distance = lastTurn - min;

    const efficiency = Math.floor((1 - distance / maxDistance) * 100);
    assertIsValidEfficiency(efficiency);

    return efficiency;
}

function assertIsValidTurn(turn: number): void {
    assert(
        turn > 1 && turn < MAX_TURN,
        `Expected turn to be a member of ]1;${MAX_TURN}[. Got ${turn}.`,
    );
}

function assertIsFleetSize(fleet: Fleet): void {
    assert(
        fleet.length > 0,
        'Expected fleet to contain at least one ship. Got none.',
    );
}

function assertIsValidEfficiency(efficiency: number): void {
    assert(
        efficiency >= 0 && efficiency <= 100,
        `Expected calculated efficiency to be a member of [0;100]. Got "${efficiency}".`,
    );
}
