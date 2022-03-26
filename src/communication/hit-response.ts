/**
 * Possible response the player must give back after being given the hit
 * coordinates.
 */
export enum HitResponse {
    MISS = 'miss',
    HIT = 'hit',
    SUNK = 'sunk',
    WON = 'won',
}

export function isHitOrSunk(response: HitResponse): boolean {
    return [HitResponse.HIT, HitResponse.SUNK].includes(response);
}
