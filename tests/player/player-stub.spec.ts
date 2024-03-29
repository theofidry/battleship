import { expect } from 'chai';
import { List } from 'immutable';
import { map, switchMap, tap } from 'rxjs';
import { HitResponse } from '../../src/communication/hit-response';
import { ShotAcknowledgement } from '../../src/communication/shot-acknowledgement';
import { Coordinate } from '../../src/grid/coordinate';
import { PlayerStub } from './player-stub';

describe('PlayerStub', () => {
    it('plays the given actions', (done) => {
        const player = new PlayerStub<string, string>(
            'PStub',
            List([
                { targetCoordinate: new Coordinate('A', '2') },
                {
                    targetedCoordinate: new Coordinate('B', '1'),
                    response: HitResponse.MISS,
                },
                {
                    response: HitResponse.MISS,
                    acknowledgement: ShotAcknowledgement.OK,
                },
                { targetCoordinate: new Coordinate('A', '4') },
            ])
        );

        expect(player.name).to.equal('PStub');

        player
            .askMove()
            .pipe(
                tap(() => {
                    const action = player.askResponse(new Coordinate('B', '1')).getValue();

                    expect(action).to.equal(HitResponse.MISS);
                }),
                tap(() => {
                    const action = player.sendResponse(HitResponse.MISS).getValue();

                    expect(action).to.equal(ShotAcknowledgement.OK);
                }),
                switchMap((firstMove) => {
                    return player
                        .askMove()
                        .pipe(
                            map((secondMove) => ({ firstMove, secondMove })),
                        );
                })
            )
            .subscribe(({ firstMove, secondMove }) => {
                expect(firstMove).to.eqls(new Coordinate('A', '2'));
                expect(secondMove).to.eqls(new Coordinate('A', '4'));

                done();
            });
    });

    it('throws an error if no action is available', () => {
        const player = new PlayerStub<string, string>(
            'PStub',
            List(),
        );

        const playActions = [
            () => player.askMove(),
            () => player.askResponse(new Coordinate('B', '1')),
            () => player.sendResponse(HitResponse.MISS),
        ];

        playActions.forEach((action) => expect(action).to.throw('No action is available.'));
    });

    it('throws an error when asking the player next move and the expected action does not match', () => {
        const player = new PlayerStub<string, string>(
            'PStub',
            List([
                {
                    response: HitResponse.MISS,
                    acknowledgement: ShotAcknowledgement.OK,
                },
            ]),
        );

        const playAction = () => player.askMove();

        expect(playAction).to.throw('Invalid action.');
    });

    it('throws an error when asking the player\'s answer and the expected action does not match', () => {
        const player = new PlayerStub<string, string>(
            'PStub',
            List([
                {
                    response: HitResponse.MISS,
                    acknowledgement: ShotAcknowledgement.OK,
                },
            ]),
        );

        const playAction = () => player.askResponse(new Coordinate('B', '1'));

        expect(playAction).to.throw('Invalid action.');
    });

    it('throws an error when asking the player\'s answer and the expected action does not match the given coordinate', () => {
        const player = new PlayerStub<string, string>(
            'PStub',
            List([
                {
                    targetedCoordinate: new Coordinate('A', '2'),
                    response: HitResponse.WON,
                },
            ]),
        );

        const playAction = () => player.askResponse(new Coordinate('B', '1'));

        expect(playAction).to.throw('Expected "A2". Got "B1".');
    });

    it('throws an error when sending the response to the player and the expected action does not match', () => {
        const player = new PlayerStub<string, string>(
            'PStub',
            List([
                { targetCoordinate: new Coordinate('A', '2') },
            ]),
        );

        const playAction = () => player.sendResponse(HitResponse.MISS);

        expect(playAction).to.throw('Invalid action.');
    });

    it('throws an error when sending the response to the player and the expected action does not match the expected response', () => {
        const player = new PlayerStub<string, string>(
            'PStub',
            List([
                {
                    response: HitResponse.MISS,
                    acknowledgement: ShotAcknowledgement.OK,
                },
            ]),
        );

        const playAction = () => player.sendResponse(HitResponse.WON);

        expect(playAction).to.throw('Expected "miss". Got "won".');
    });
});
