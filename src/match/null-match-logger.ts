import { HitResponse } from '../communication/hit-response';
import { AnyCoordinate, AnyPlayer, MatchLogger } from './match-logger';

export class NullMatchLogger implements MatchLogger {
    start(playerA: AnyPlayer, playerB: AnyPlayer): void {
        // Do nothing
    }

    startTurn(turn: number): void {
        // Do nothing
    }

    recordSelectedPlayer(player: AnyPlayer): void {
        // Do nothing
    }

    recordPlayerMove(player: AnyPlayer, targetCoordinate: AnyCoordinate): void {
        // Do nothing
    }

    recordOpponentResponse(opponent: AnyPlayer, hitResponse: HitResponse): void {
        // Do nothing
    }

    endTurn(): void {
        // Do nothing
    }

    recordWinner(winner: AnyPlayer, turn: number): void {
        // Do nothing
    }

    stopGame(player: AnyPlayer): void {
        // Do nothing
    }
}
