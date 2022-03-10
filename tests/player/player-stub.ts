import { List, Map } from 'immutable';
import * as _ from 'lodash';
import { Observable, of } from 'rxjs';
import { assertIsNonNullObject } from '../../src/assert/assert-is-non-null-object';
import { assertIsNotUndefined } from '../../src/assert/assert-is-not-undefined';
import { HitResponse } from '../../src/communication/hit-response';
import { ShotAcknowledgement } from '../../src/communication/shot-acknowledgement';
import { Coordinate } from '../../src/grid/coordinate';
import { GridRows } from '../../src/grid/grid';
import { Player } from '../../src/player/player';
import { hasOwnProperty } from '../../src/utils/has-own-property';
import { nothingIfUndefined, Optional } from '../../src/utils/optional';
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
>(
    value: unknown,
    message?: Error | string,
): asserts value is MoveAction<ColumnIndex, RowIndex> {
    assertIsNonNullObject(value, message);
    assert(hasOwnProperty(value, 'targetCoordinate'), message);
}

type ResponseAction<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    targetedCoordinate: Coordinate<ColumnIndex, RowIndex>,
    response: HitResponse | undefined,
};

function assertIsAResponseAction<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
>(
    value: unknown,
    message?: Error | string,
): asserts value is ResponseAction<ColumnIndex, RowIndex> {
    assertIsNonNullObject(value, message);
    assert(hasOwnProperty(value, 'targetedCoordinate'), message);
    assert(hasOwnProperty(value, 'response'), message);
}

type AcknowledgementAction = {
    response: HitResponse,
    acknowledgement: ShotAcknowledgement | undefined,
};

function assertIsAnAcknowledgementAction(
    value: unknown,
    message?: Error | string,
): asserts value is AcknowledgementAction {
    assertIsNonNullObject(value, message);
    assert(hasOwnProperty(value, 'response'), message);
    assert(hasOwnProperty(value, 'acknowledgement'), message);
}

type PlayerAction<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = AcknowledgementAction | MoveAction<ColumnIndex, RowIndex> | ResponseAction<ColumnIndex, RowIndex>;

export class PlayerStub<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> implements Player<ColumnIndex, RowIndex, unknown> {
    private turnActions: Array<PlayerAction<ColumnIndex, RowIndex>>;

    constructor(
        readonly name: string,
        turnActions: List<PlayerAction<ColumnIndex, RowIndex>>
    ) {
        this.turnActions = turnActions.toArray();
    }

    askMove(): Observable<Coordinate<ColumnIndex, RowIndex>> {
        const action = this.getNextMove();
        assertIsAMoveAction(action, 'Invalid action.');

        return of(action.targetCoordinate);
    }

    askResponse(coordinates: Coordinate<ColumnIndex, RowIndex>): Optional<HitResponse> {
        const action = this.getNextMove();

        assertIsAResponseAction(action, 'Invalid action.');
        assert(
            _.isEqual(action.targetedCoordinate, coordinates),
            `Expected "${action.targetedCoordinate.toString()}". Got "${coordinates.toString()}".`
        );

        return nothingIfUndefined(action.response);
    }

    sendResponse(response: HitResponse): Optional<ShotAcknowledgement> {
        const action = this.getNextMove();

        assertIsAnAcknowledgementAction(action, 'Invalid action.');
        assert(
            action.response === response,
            `Expected "${action.response}". Got "${response}".`
        );

        return nothingIfUndefined(action.acknowledgement);
    }

    getOpponentGridRows(): Readonly<GridRows<ColumnIndex, RowIndex, unknown>> {
        return Map();
    }

    getPlayerGridRows(): Readonly<GridRows<ColumnIndex, RowIndex, unknown>> {
        return Map();
    }

    private getNextMove(): PlayerAction<ColumnIndex, RowIndex> {
        const action = this.turnActions.shift();

        assertIsNotUndefined(action, 'No action is available.');

        return action;
    }
}
