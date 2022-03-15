import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { Player } from '../player/player';

export type AnyPlayer = Player<any, any, any, any>;
export type AnyCoordinate = Coordinate<any, any>;

export interface MatchLogger {
    start(playerA: AnyPlayer, playerB: AnyPlayer): void;

    startTurn(turn: number): void;

    recordSelectedPlayer(player: AnyPlayer): void;

    recordPlayerMove(player: AnyPlayer, targetCoordinate: AnyCoordinate): void;

    recordOpponentResponse(opponent: AnyPlayer, hitResponse: HitResponse): void;

    endTurn(): void;

    recordWinner(winner: AnyPlayer, turn: number): void;
}
