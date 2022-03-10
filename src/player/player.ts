import { Observable } from 'rxjs';
import { HitResponse } from '../communication/hit-response';
import { ShotAcknowledgement } from '../communication/shot-acknowledgement';
import { Coordinate } from '../grid/coordinate';
import { GridRows } from '../grid/grid';
import { PositionedShip } from '../ship/positioned-ship';
import { Optional } from '../utils/optional';

export interface Player<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    OpponentGridCell,
> {
    readonly name: string;

    askMove(): Observable<Coordinate<ColumnIndex, RowIndex>>;

    sendResponse(response: HitResponse): Optional<ShotAcknowledgement>;

    askResponse(coordinates: Coordinate<ColumnIndex, RowIndex>): Optional<HitResponse>;

    getPlayerGridRows(): Readonly<GridRows<ColumnIndex, RowIndex, PositionedShip<ColumnIndex, RowIndex>|undefined>>;

    getOpponentGridRows(): Readonly<GridRows<ColumnIndex, RowIndex, OpponentGridCell>>;
}
