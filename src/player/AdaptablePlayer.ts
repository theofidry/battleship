import { assertNotUndefined } from '@app/assert/notUndefined';
import { ShotAcknowledgement } from '@app/communications/ShotAcknowledgement';
import { ShotResponse } from '@app/communications/ShotResponse';
import { Coordinate } from '@app/grid/Coordinate';
import { Grid } from '@app/grid/Grid';
import { OpponentGrid } from '@app/grid/OpponentGrid';
import { HitStrategy } from '@app/player/hit-strategy/HitStrategy';
import { RandomHitStrategy } from '@app/player/hit-strategy/RandomHitStrategy';
import { PlacementStrategy } from '@app/player/placement-strategy/PlacementStrategy';
import { RandomPlacementStrategy } from '@app/player/placement-strategy/RandomPlacementStrategy';
import { Player } from '@app/player/Player';
import { PlayerFleet } from '@app/player/PlayerFleet';
import { Fleet } from '@app/ship/Fleet';

export class AdaptablePlayer {
    private readonly fleet: PlayerFleet;

    private readonly ownGrid = new Grid();

    private readonly opponentGrid = new OpponentGrid();

    private lastMove: Coordinate | undefined;

    constructor(
        public readonly name: string,
        grid: Grid,
        fleet: Fleet,
        placementStrategy: PlacementStrategy,
        private readonly hitStrategy: HitStrategy,
    ) {
        this.fleet = placementStrategy.place(grid, fleet);
    }

    askMove(): Coordinate {
        const nextMove = this.hitStrategy.decide(this.opponentGrid);

        this.lastMove = nextMove;

        return nextMove;
    }

    sendResponse(response: ShotResponse): ShotAcknowledgement {
        const { lastMove } = this;
        assertNotUndefined(lastMove);

        switch (response) {
            case ShotResponse.MISS:
                this.opponentGrid.markAsMissed(lastMove);
                break;

            case ShotResponse.HIT:
                this.opponentGrid.markAsHit(lastMove);
                break;

            case ShotResponse.SUNK:
                this.opponentGrid.markAsSunk(lastMove);
                break;

            case ShotResponse.WON:
                break;

            case ShotResponse.ERROR:
                return ShotAcknowledgement.ERROR;
        }

        return ShotAcknowledgement.OK;
    }

    askResponse(coordinates: Coordinate): ShotResponse {
        return this.fleet.recordHit(coordinates);
    }
}

export function createDumbPlayer(name: string, grid: Grid, fleet: Fleet): Player {
    return new AdaptablePlayer(
        `DumbPlayer ${name}`.trim(),
        grid,
        fleet,
        RandomPlacementStrategy,
        RandomHitStrategy,
    );
}
