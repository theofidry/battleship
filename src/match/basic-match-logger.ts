import { HitResponse } from '../communication/hit-response';
import { Logger } from '../logger/logger';
import { AnyCoordinate, AnyPlayer, MatchLogger } from './match-logger';

export class BasicMatchLogger implements MatchLogger {
    constructor(private readonly logger: Logger) {
    }

    start(playerA: AnyPlayer, playerB: AnyPlayer): void {
        this.logger.log(`Starting a match between the player "${playerA.name}" and "${playerB.name}".`);
    }

    startTurn(turn: number): void {
        this.logger.log(`Turn ${turn}.`);
    }

    recordSelectedPlayer(player: AnyPlayer): void {
        // Do nothing
    }

    recordPlayerMove(player: AnyPlayer, targetCoordinate: AnyCoordinate): void {
        this.logger.log(`"${player.name}" targets "${targetCoordinate.toString()}".`);
    }

    recordOpponentResponse(opponent: AnyPlayer, hitResponse: HitResponse): void {
        this.logger.log(`"${opponent.name}" replies "${hitResponse}".`);
    }

    endTurn(): void {
        // Do nothing
    }

    recordWinner(winner: AnyPlayer, turn: number): void {
        this.logger.log(`"${winner.name}" has won the match in ${turn} turns.`);
    }

    stopGame(player: AnyPlayer): void {
        this.logger.log('Game stopped.');
    }
}
