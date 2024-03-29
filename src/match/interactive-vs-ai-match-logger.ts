import chalk from 'chalk';
import { assert } from '../assert/assert';
import { assertIsNotUndefined } from '../assert/assert-is-not-undefined';
import { assertIsUnreachableCase } from '../assert/assert-is-unreachable';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { Logger } from '../logger/logger';
import { LOGO } from '../logo';
import {
    printOpponentGrid, printPlayerGrid,
} from '../standard-grid/interactive-player/grid-printer';
import { InteractivePlayer } from '../standard-grid/interactive-player/interactive-player';
import { AnyCoordinate, AnyPlayer, MatchLogger } from './match-logger';

type TurnRecord = {
    turn: number,
    player: AnyPlayer,
    targetCoordinate: Coordinate<any, any>,
    hitResponse: HitResponse,
};

function isCompleteTurnRecord(record: Partial<TurnRecord>): record is TurnRecord {
    return undefined !== record.turn
        && undefined !== record.player
        && undefined !== record.targetCoordinate
        && undefined !== record.hitResponse;
}

const HISTORY_SIZE = 5;

export class InteractiveVsAiMatchLogger implements MatchLogger {
    private turnRecord: Partial<TurnRecord> = {};
    private interactivePlayerHistory: TurnRecord[] = [];
    private aiPlayerHistory: TurnRecord[] = [];
    private playerColorizer: PlayerColorizer | undefined;

    constructor(private readonly logger: Logger) {
    }

    start(playerA: AnyPlayer, playerB: AnyPlayer): void {
        this.playerColorizer = createPlayerColorizer(playerA, playerB);

        this.logger.log(`Starting a match between the player ${this.colorizePlayer(playerA)} and ${this.colorizePlayer(playerB)}.`);
        this.newLine();
    }

    startTurn(turn: number): void {
        this.turnRecord.turn = turn;
    }

    recordSelectedPlayer(player: AnyPlayer): void {
        this.turnRecord.player = player;

        const turn = this.turnRecord.turn;
        assertIsNotUndefined(turn);

        if (!isInteractivePlayer(player)) {
            return;
        }

        this.newLine();
        this.logger.log(`Turn ${turn}.`);

        printPlayerGrid(player, this.logger);
        this.newLine();

        this.showHistory('Opponent History', this.aiPlayerHistory);
        this.showHistory('History', this.interactivePlayerHistory);
    }

    recordPlayerMove(_player: AnyPlayer, targetCoordinate: AnyCoordinate): void {
        this.turnRecord.targetCoordinate = targetCoordinate;
    }

    recordOpponentResponse(opponent: AnyPlayer, hitResponse: HitResponse): void {
        this.turnRecord.hitResponse = hitResponse;
    }

    endTurn(): void {
        const record = this.getCompleteTurnRecord();
        this.turnRecord = {};

        const { turn, player, targetCoordinate, hitResponse } = record;

        if (isInteractivePlayer(player)) {
            this.interactivePlayerHistory.unshift(record);
        } else {
            this.aiPlayerHistory.unshift(record);
            this.newLine(2);
            this.logger.log(LOGO);
            this.newLine(2);
            this.logger.log(
                `Turn ${turn}: ${this.colorizePlayer(player)} shoot at "${colorizeCoordinate(targetCoordinate)}" and ${colorizeHitResponse(hitResponse)}.`,
            );
        }
    }

    recordWinner(winner: AnyPlayer, turn: number): void {
        this.newLine(2);
        this.logger.log(`${this.colorizePlayer(winner)} ${chalk.bold('WON')} the match in ${chalk.yellowBright(turn)} turns! 🎉`);
        this.newLine(2);
    }

    stopGame(player: AnyPlayer): void {
        this.newLine();
        this.logger.log('🛑 Stopped the game.');
        this.newLine();

        printOpponentGrid(player, this.logger);
    }

    private newLine(times = 1): void {
        for (let i = 0; i < times; i++) {
            this.logger.log('');
        }
    }

    private colorizePlayer(player: AnyPlayer): string {
        const playerColorizer = this.playerColorizer;
        assertIsNotUndefined(playerColorizer);

        return playerColorizer(player);
    }

    private getCompleteTurnRecord(): TurnRecord {
        const record = this.turnRecord;
        assert(isCompleteTurnRecord(record));

        return record;
    }

    private showHistory(label: string, playerHistory: TurnRecord[]): void {
        const playerHistoryExcerpt = selectHistory(playerHistory);

        if (playerHistoryExcerpt.length > 0) {
            this.logger.log(`${label}: ${playerHistoryExcerpt}`);
            this.newLine();
        }
    }
}

type PlayerColorizer = (player: AnyPlayer)=> string;

function createPlayerColorizer(playerA: AnyPlayer, playerB: AnyPlayer): PlayerColorizer {
    return ({ name }) => {
        assert([playerA.name, playerB.name].includes(name));

        return name === playerA.name
            ? chalk.redBright(playerA.name)
            : chalk.blueBright(playerB.name);

    };
}

function colorizeCoordinate(coordinate: AnyCoordinate): string {
    return chalk.yellowBright(coordinate.toString());
}

function colorizeHitResponse(hitResponse: HitResponse): string {
    switch (hitResponse) {
        case HitResponse.SUNK:
            return `${chalk.yellowBright(hitResponse)} 💀`;

        case HitResponse.HIT:
            return `${chalk.redBright(hitResponse)} 💥`;

        case HitResponse.MISS:
            return chalk.blueBright(hitResponse);

        case HitResponse.WON:
            return chalk.bold(chalk.yellowBright(hitResponse));
    }

    assertIsUnreachableCase(hitResponse);
}

function isInteractivePlayer(player: AnyPlayer): player is InteractivePlayer {
    return player instanceof InteractivePlayer;
}

function selectHistory(playerHistory: TurnRecord[]): string {
    return playerHistory
        .slice(0, HISTORY_SIZE)
        .map(({ targetCoordinate, hitResponse }) => `${colorizeCoordinate(targetCoordinate)}: ${colorizeHitResponse(hitResponse)}`)
        .join(', ');
}
