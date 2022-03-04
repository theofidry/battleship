import { expect } from 'chai';
import { List } from 'immutable';
import * as _ from 'lodash';
import { beforeEach } from 'mocha';
import { TestScheduler } from 'rxjs/testing';
import { assertIsNonNullObject } from '../src/assert/assert-is-non-null-object';
import { assertIsNotUndefined } from '../src/assert/assert-is-not-undefined';
import { HitResponse } from '../src/communication/hit-response';
import { ShotAcknowledgement } from '../src/communication/shot-acknowledgement';
import { Game } from '../src/game';
import { Coordinate } from '../src/grid/coordinate';
import { BufferLogger } from '../src/logger/buffer-logger';
import { Player } from '../src/player/player';
import { hasOwnProperty } from '../src/utils/has-own-property';
import { just, Optional } from '../src/utils/optional';
import assert = require('node:assert');

const testScheduler = new TestScheduler((actual, expected) => {
    // asserting the two objects are equal - required
    // for TestScheduler assertions to work via your test framework
    // e.g. using chai.
    expect(actual).deep.equal(expected);
});

type SmallGridColumnIndex = 'C1' | 'C2';
type SmallGridRowIndex = 'R1' | 'R2';

type MoveAction = {
    targetCoordinate: Coordinate<SmallGridColumnIndex, SmallGridRowIndex>,
}

function assertIsAMoveAction(value: unknown): asserts value is MoveAction {
    assertIsNonNullObject(value);
    assert(hasOwnProperty(value, 'targetCoordinate'));
}

type ResponseAction = {
    targetedCoordinate: Coordinate<SmallGridColumnIndex, SmallGridRowIndex>,
    response: HitResponse,
}

function assertIsAResponseAction(value: unknown): asserts value is ResponseAction {
    assertIsNonNullObject(value);
    assert(hasOwnProperty(value, 'targetedCoordinate'));
    assert(hasOwnProperty(value, 'response'));
}

type AcknowledgementAction = {
    response: HitResponse,
    acknowledgement: ShotAcknowledgement,
}

function assertIsAnAcknowledgementAction(value: unknown): asserts value is AcknowledgementAction {
    assertIsNonNullObject(value);
    assert(hasOwnProperty(value, 'response'));
    assert(hasOwnProperty(value, 'acknowledgement'));
}

type PlayerAction = MoveAction | ResponseAction | AcknowledgementAction;

class DummyPlayer implements Player<SmallGridColumnIndex, SmallGridRowIndex> {
    private turnActions: Array<PlayerAction>;

    constructor(
        readonly name: string,
        turnActions: List<PlayerAction>
    ) {
        this.turnActions = turnActions.toArray();
    }

    askMove(): Coordinate<SmallGridColumnIndex, SmallGridRowIndex> {
        const action = this.turnActions.shift();
        assertIsAMoveAction(action);

        return action.targetCoordinate;
    }

    askResponse(coordinates: Coordinate<SmallGridColumnIndex, SmallGridRowIndex>): Optional<HitResponse> {
        const action = this.turnActions.shift();

        assertIsAResponseAction(action);
        assert(_.isEqual(action.targetedCoordinate, coordinates);

        return just(action.response);
    }

    sendResponse(response: HitResponse): Optional<ShotAcknowledgement> {
        return undefined;
    }

    private getNextAction(): PlayerAction {
        const action = this.turnActions.first();

        this.turnActions = this.turnActions.shift();

        return action;
    }
}

describe('Game', () => {
    const logger = new BufferLogger();

    beforeEach(() => logger.clear());

    it('be created and play', () => {
        const game = new Game(logger);

        game
            .play()
            .subscribe(());
    });
});
