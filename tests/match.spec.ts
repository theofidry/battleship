import { expect } from 'chai';
import { List } from 'immutable';
import * as _ from 'lodash';
import { beforeEach } from 'mocha';
import { TestScheduler } from 'rxjs/testing';
import { assertIsNonNullObject } from '../src/assert/assert-is-non-null-object';
import { assertIsNotUndefined } from '../src/assert/assert-is-not-undefined';
import { HitResponse } from '../src/communication/hit-response';
import { ShotAcknowledgement } from '../src/communication/shot-acknowledgement';
import { Match } from '../src/match';
import { Coordinate } from '../src/grid/coordinate';
import { BufferLogger } from '../src/logger/buffer-logger';
import { Player } from '../src/player/player';
import { hasOwnProperty } from '../src/utils/has-own-property';
import { just, Optional } from '../src/utils/optional';
import { PlayerStub } from './player/player-stub';
import assert = require('node:assert');

const testScheduler = new TestScheduler((actual, expected) => {
    // asserting the two objects are equal - required
    // for TestScheduler assertions to work via your test framework
    // e.g. using chai.
    expect(actual).deep.equal(expected);
});

type SmallGridColumnIndex = 'C1' | 'C2';
type SmallGridRowIndex = 'R1' | 'R2';

describe('Game', () => {
    const logger = new BufferLogger();

    beforeEach(() => logger.clear());

    it('be created and play', () => {
        const game = new Match(logger);

        const playerA = new PlayerStub(
            'Player A',
            List([

            ]),
        );

        const playerB = new PlayerStub(
            'Player B',
            List([

            ]),
        );

        testScheduler.run((helpers) => {
            const { cold, time, expectObservable, expectSubscriptions } = helpers;

            const e1 = cold(' -a--b--c---|');
            const e1subs = '  ^----------!';
            const t = time('   ---|       '); // t = 3
            const expected = '-a-----c---|';



            const result$ = game.play(playerA, playerB);

            expectObservable(result$).toEqual(playerA);
            expectSubscriptions(e1.subscriptions).toBe(e1subs);
        });
    });
});
