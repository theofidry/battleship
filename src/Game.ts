import { Player } from '@app/player/Player';
import { ShotResponse } from '@app/communications/ShotResponse';
import { ShotAcknowledgement } from '@app/communications/ShotAcknowledgement';

export class Game {
    constructor(
        public readonly playerA: Player,
        public readonly playerB: Player,
    ) {
    }

    getWinner(): Player | null {
        return null;
    }

    playTurn(): void {
        const coordinates = this.playerA.askMove();
        const response = this.playerB.askResponse(coordinates);

        if (ShotResponse.ERROR === response) {
            throw new Error('Invalid response received!');
        }

        const acknowledgement = this.playerA.sendResponse(response);

        if (ShotAcknowledgement.ERROR === acknowledgement) {
            throw new Error('Invalid acknowledgement received!');
        }
    }
}
