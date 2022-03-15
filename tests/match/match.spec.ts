import { expect } from 'chai';
import { List } from 'immutable';
import { beforeEach } from 'mocha';
import { HitResponse } from '../../src/communication/hit-response';
import { ShotAcknowledgement } from '../../src/communication/shot-acknowledgement';
import { Coordinate } from '../../src/grid/coordinate';
import { BufferLogger, Record as LogRecord } from '../../src/logger/buffer-logger';
import { BasicMatchLogger } from '../../src/match/basic-match-logger';
import { Match } from '../../src/match/match';
import { Player } from '../../src/player/player';
import { PlayerStub } from '../player/player-stub';

type SmallGridColumnIndex = 'C1' | 'C2';
type SmallGridRowIndex = 'R1' | 'R2';

type TestPlayer = Player<SmallGridColumnIndex, SmallGridRowIndex, unknown, unknown>;

function createLogRecord(message: string): LogRecord {
    return { message: message, optionalParams: [] };
}

describe('Match', () => {
    const logger = new BufferLogger();
    const createGame = () => {
        const game = new Match(new BasicMatchLogger(logger));

        const playerA: TestPlayer = new PlayerStub(
            'Player A',
            List([
                { targetCoordinate: new Coordinate('C1', 'R2') },
                { response: HitResponse.MISS, acknowledgement: ShotAcknowledgement.OK },
                { targetedCoordinate: new Coordinate('C2', 'R1'), response: HitResponse.HIT },
                { targetCoordinate: new Coordinate('C1', 'R1') },
                { response: HitResponse.WON, acknowledgement: ShotAcknowledgement.OK },
            ]),
        );

        const playerB: TestPlayer = new PlayerStub(
            'Player B',
            List([
                { targetedCoordinate: new Coordinate('C1', 'R2'), response: HitResponse.MISS },
                { targetCoordinate: new Coordinate('C2', 'R1') },
                { response: HitResponse.HIT, acknowledgement: ShotAcknowledgement.OK },
                { targetedCoordinate: new Coordinate('C1', 'R1'), response: HitResponse.WON },
            ]),
        );

        return {
            game,
            playerA,
            playerB,
            expectedWinner: playerA,
            expectedFinalTurn: 3,
        };
    };

    beforeEach(() => logger.clear());

    it('can be created and played', (done) => {
        const { game, playerA, playerB } = createGame();

        const expectedLogs = [
            createLogRecord('Starting a match between the player "Player A" and "Player B".'),
            createLogRecord('Turn 1.'),
            createLogRecord('"Player A" targets "C1R2".'),
            createLogRecord('"Player B" replies "miss".'),
            createLogRecord('Turn 2.'),
            createLogRecord('"Player B" targets "C2R1".'),
            createLogRecord('"Player A" replies "hit".'),
            createLogRecord('Turn 3.'),
            createLogRecord('"Player A" targets "C1R1".'),
            createLogRecord('"Player B" replies "won".'),
            createLogRecord('"Player A" has won the match in 3 turns.'),
        ];

        const result$ = game.play(playerA, playerB, 100);

        result$.subscribe({
            complete: () => {
                expect(logger.getRecords()).to.eqls(expectedLogs);

                done();
            },
        });
    });

    it('emits each turn result', (done) => {
        const { game, playerA, playerB } = createGame();

        const expectedResults = [
            { winner: undefined, turn: 1 },
            { winner: undefined, turn: 2 },
            { winner: playerA, turn: 3 },
        ];

        const result$ = game.play(playerA, playerB, 100);

        result$.subscribe({
            next: (turnResult) => {
                const expectedResult = expectedResults.shift();

                expect(turnResult).to.eqls(expectedResult);
            },
            complete: () => done(),
        });
    });

    it('the match can be replayed without the processing happening twice', (done) => {
        const { game, playerA, playerB } = createGame();

        const expectedResults = [
            { winner: undefined, turn: 1 },
            { winner: undefined, turn: 2 },
            { winner: playerA, turn: 3 },
        ];

        const result$ = game.play(playerA, playerB, 100);

        result$.subscribe();
        result$.subscribe();
        result$.subscribe({
            next: (turnResult) => {
                const expectedResult = expectedResults.shift();

                expect(turnResult).to.eqls(expectedResult);
            },
            complete: () => done(),
        });
    });

    it('fails when a player throws an error when being asked his/her turn', (done) => {
        const { game, playerA } = createGame();

        const expectedLogs = [
            createLogRecord('Starting a match between the player "Player A" and "Fake Player".'),
            createLogRecord('Turn 1.'),
            createLogRecord('"Player A" targets "C1R2".'),
        ];

        const result$ = game.play(
            playerA,
            new PlayerStub('Fake Player', List()),
            100,
        );

        result$.subscribe({
            next: () => expect.fail('Did not expect to be called'),
            error: (obsError: Error) => {
                expect(logger.getRecords()).to.eqls(expectedLogs);
                expect(obsError.message).to.eqls('No action is available.');

                done();
            },
        });
    });

    it('fails when a player does not return any hit response', (done) => {
        const { game, playerA } = createGame();

        const expectedLogs = [
            createLogRecord('Starting a match between the player "Player A" and "Player B".'),
            createLogRecord('Turn 1.'),
            createLogRecord('"Player A" targets "C1R2".'),
        ];

        const result$ = game.play(
            playerA,
            new PlayerStub(
                'Player B',
                List([
                    { targetedCoordinate: new Coordinate('C1', 'R2'), response: undefined },
                ]),
            ),
            100,
        );

        result$.subscribe({
            next: () => expect.fail('Did not expect to be called'),
            error: (obsError: Error) => {
                expect(logger.getRecords()).to.eqls(expectedLogs);
                expect(obsError.message).to.eqls('The opponent could not respond.');

                done();
            },
        });
    });

    it('fails when the player throws an error when being asked to acknowledge the answer', (done) => {
        const { game } = createGame();

        const expectedLogs = [
            createLogRecord('Starting a match between the player "Player A" and "Player B".'),
            createLogRecord('Turn 1.'),
            createLogRecord('"Player A" targets "C1R2".'),
            createLogRecord('"Player B" replies "miss".'),
        ];

        const result$ = game.play(
            new PlayerStub(
                'Player A',
                List([
                    { targetCoordinate: new Coordinate('C1', 'R2') },
                    { response: HitResponse.MISS, acknowledgement: undefined },
                ]),
            ),
            new PlayerStub(
                'Player B',
                List([
                    { targetedCoordinate: new Coordinate('C1', 'R2'), response: HitResponse.MISS },
                ]),
            ),
            100,
        );

        result$.subscribe({
            next: () => expect.fail('Did not expect to be called'),
            error: (obsError: Error) => {
                expect(logger.getRecords()).to.eqls(expectedLogs);
                expect(obsError.message).to.eqls('The player could not acknowledge the opponent response.');

                done();
            },
        });
    });

    it('fails when the player does not acknowledge the answer', (done) => {
        const { game } = createGame();

        const expectedLogs = [
            createLogRecord('Starting a match between the player "Player A" and "Player B".'),
            createLogRecord('Turn 1.'),
            createLogRecord('"Player A" targets "C1R2".'),
            createLogRecord('"Player B" replies "miss".'),
        ];

        const result$ = game.play(
            new PlayerStub(
                'Player A',
                List([
                    { targetCoordinate: new Coordinate('C1', 'R2') },
                ]),
            ),
            new PlayerStub(
                'Player B',
                List([
                    { targetedCoordinate: new Coordinate('C1', 'R2'), response: HitResponse.MISS },
                ]),
            ),
            100,
        );

        result$.subscribe({
            next: () => expect.fail('Did not expect to be called'),
            error: (obsError: Error) => {
                expect(logger.getRecords()).to.eqls(expectedLogs);
                expect(obsError.message).to.eqls('No action is available.');

                done();
            },
        });
    });

    it('fails when the max number of turn has been reached', (done) => {
        const { game, playerA, playerB } = createGame();

        const expectedLogs = [
            createLogRecord('Starting a match between the player "Player A" and "Player B".'),
            createLogRecord('Turn 1.'),
            createLogRecord('"Player A" targets "C1R2".'),
            createLogRecord('"Player B" replies "miss".'),
            createLogRecord('Turn 2.'),
            createLogRecord('"Player B" targets "C2R1".'),
            createLogRecord('"Player A" replies "hit".'),
        ];

        const result$ = game.play(playerA, playerB, 2);

        const expectedTurnResults = [
            { winner: undefined, turn: 1 },
            { winner: undefined, turn: 2 },
        ];

        result$.subscribe({
            next: (turnResult) => {
                const expectedTurnResult = expectedTurnResults.shift();

                expect(turnResult).to.eqls(expectedTurnResult);
            },
            error: (obsError: Error) => {
                expect(logger.getRecords()).to.eqls(expectedLogs);
                expect(obsError.name).to.equal('MaxTurnReached');
                expect(obsError.message).to.eqls('The match could not be finished in 2 turns.');

                done();
            },
        });
    });

    it('fails when the max number of turn is lower than 2', () => {
        const { game, playerA, playerB } = createGame();

        const play = () => game.play(playerA, playerB, 1);

        expect(play).to.throw('Expect the match to allow at least 2 turns. Got 1.');
    });
});
