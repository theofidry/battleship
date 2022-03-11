import { HitResponse } from './communication/hit-response';
import { Coordinate } from './grid/coordinate';
import { Logger } from './logger/logger';
import { Player } from './player/player';

type AnyPlayer = Player<any, any, any>;

export class MatchLogger {
    constructor(private readonly logger: Logger) {
    }

    start(playerA: AnyPlayer, playerB: AnyPlayer): void {
        this.logger.log(`Starting a match between the player "${playerA.name}" and "${playerB.name}".`);
    }

    startTurn(turn: number): void {
        this.logger.log(`Turn ${turn}.`);
    }

    recordPlayerMove(player: AnyPlayer, targetCoordinate: Coordinate<any, any>): void {
        this.logger.log(`"${player.name}" targets "${targetCoordinate.toString()}".`);
    }

    recordOpponentResponse(opponent: AnyPlayer, hitResponse: HitResponse): void {
        this.logger.log(`"${opponent.name}" replies "${hitResponse}".`);
    }

    endTurn(): void {
        // Do nothing
    }

    logWinner(winner: AnyPlayer, turn: number): void {
        this.logger.log(`"${winner.name}" has won the match in ${turn} turns.`);
    }
}
