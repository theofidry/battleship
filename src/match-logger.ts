import chalk from 'chalk';
import { assertIsNotUndefined } from './assert/assert-is-not-undefined';
import { assertIsUnreachableCase } from './assert/assert-is-unreachable';
import { HitResponse } from './communication/hit-response';
import { Coordinate } from './grid/coordinate';
import { Logger } from './logger/logger';
import { LOGO } from './logo';
import { Player } from './player/player';
import { printPlayerGrid } from './standard-grid/interactive-player/grid-printer';
import { InteractivePlayer } from './standard-grid/interactive-player/interactive-player';
import assert = require('node:assert');

type AnyPlayer = Player<any, any, any>;

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

export class MatchLogger {
    private turnRecord: Partial<TurnRecord> = {};
    private interactivePlayerHistory: TurnRecord[] = [];

    constructor(private readonly logger: Logger) {
    }

    start(playerA: AnyPlayer, playerB: AnyPlayer): void {
        // TODO: better assign the player's colors
        this.logger.log(`Starting a match between the player ${chalk.redBright(playerA.name)} and ${chalk.blueBright(playerB.name)}.`);
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

        const interactivePlayerHistory = this.interactivePlayerHistory
            .slice(-5)
            .map(({ targetCoordinate, hitResponse }) => `${chalk.yellowBright(targetCoordinate.toString())}: ${castHitResponse(hitResponse)}`)
            .join(', ');

        if (interactivePlayerHistory.length > 0) {
            this.newLine();
            this.logger.log(`History: ${interactivePlayerHistory}`);
            this.newLine();
        }
    }

    recordPlayerMove(_player: AnyPlayer, targetCoordinate: Coordinate<any, any>): void {
        this.turnRecord.targetCoordinate = targetCoordinate;
    }

    recordOpponentResponse(opponent: AnyPlayer, hitResponse: HitResponse): void {
        this.turnRecord.hitResponse = hitResponse;
    }

    endTurn(): void {
        const record = this.turnRecord;
        this.turnRecord = {};

        assert(isCompleteTurnRecord(record));

        const { turn, player, targetCoordinate, hitResponse } = record;

        if (isInteractivePlayer(player)) {
            this.interactivePlayerHistory.unshift(record);
        } else {
            this.newLine(2);
            this.logger.log(LOGO);
            this.newLine(2);
            this.logger.log(
                `Turn ${turn}: ${chalk.redBright(player.name)} shoot at "${chalk.yellowBright(targetCoordinate.toString())}" and ${castHitResponse(hitResponse)}.`,
            );
        }
    }

    logWinner(winner: AnyPlayer, turn: number): void {
        this.newLine(2);
        this.logger.log(`${chalk.blueBright(winner.name)} ${chalk.bold('WON')} the match in ${chalk.yellowBright(turn)} turns! 🎉`);
        this.newLine(2);
    }

    private newLine(times = 1): void {
        for (let i = 0; i < times; i++) {
            this.logger.log('');
        }
    }
}

function castHitResponse(hitResponse: HitResponse): string {
    switch (hitResponse) {
        case HitResponse.SUNK:
            return chalk.yellowBright(hitResponse);

        case HitResponse.HIT:
            return chalk.redBright(hitResponse);

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
