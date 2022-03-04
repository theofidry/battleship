import { List } from 'immutable';
import * as _ from 'lodash';
import { assertIsNonNullObject } from '../../src/assert/assert-is-non-null-object';
import { HitResponse } from '../../src/communication/hit-response';
import { ShotAcknowledgement } from '../../src/communication/shot-acknowledgement';
import { Coordinate } from '../../src/grid/coordinate';
import { Player } from '../../src/player/player';
import { hasOwnProperty } from '../../src/utils/has-own-property';
import { just, Optional } from '../../src/utils/optional';
import assert = require('node:assert');

type MoveAction<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    targetCoordinate: Coordinate<ColumnIndex, RowIndex>,
};

function assertIsAMoveAction<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(value: unknown): asserts value is MoveAction<ColumnIndex, RowIndex> {
    assertIsNonNullObject(value);
    assert(hasOwnProperty(value, 'targetCoordinate'));
}

type ResponseAction<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    targetedCoordinate: Coordinate<ColumnIndex, RowIndex>,
    response: HitResponse,
};

function assertIsAResponseAction<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(value: unknown): asserts value is ResponseAction<ColumnIndex, RowIndex> {
    assertIsNonNullObject(value);
    assert(hasOwnProperty(value, 'targetedCoordinate'));
    assert(hasOwnProperty(value, 'response'));
}

type AcknowledgementAction = {
    response: HitResponse,
    acknowledgement: ShotAcknowledgement,
};

function assertIsAnAcknowledgementAction(value: unknown): asserts value is AcknowledgementAction {
    assertIsNonNullObject(value);
    assert(hasOwnProperty(value, 'response'));
    assert(hasOwnProperty(value, 'acknowledgement'));
}

type PlayerAction<
ColumnIndex extends PropertyKey,
RowIndex extends PropertyKey,
> = AcknowledgementAction | MoveAction<ColumnIndex, RowIndex> | ResponseAction<ColumnIndex, RowIndex>;

export class DummyPlayer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> implements Player<ColumnIndex, RowIndex> {
    private turnActions: Array<PlayerAction<ColumnIndex, RowIndex>>;

    constructor(
        readonly name: string,
        turnActions: List<PlayerAction<ColumnIndex, RowIndex>>
    ) {
        this.turnActions = turnActions.toArray();
    }

    askMove(): Coordinate<ColumnIndex, RowIndex> {
        const action = this.turnActions.shift();
        assertIsAMoveAction(action);

        return action.targetCoordinate;
    }

    askResponse(coordinates: Coordinate<ColumnIndex, RowIndex>): Optional<HitResponse> {
        const action = this.turnActions.shift();

        assertIsAResponseAction(action);
        assert(_.isEqual(action.targetedCoordinate, coordinates));

        return just(action.response);
    }

    sendResponse(response: HitResponse): Optional<ShotAcknowledgement> {
        const action = this.turnActions.shift();

        assertIsAnAcknowledgementAction(action);
        assert(_.isEqual(action.acknowledgement, response));

        return just(action.acknowledgement);
    }
}
