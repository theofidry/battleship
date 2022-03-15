import { Observable } from 'rxjs';
import { HitResponse } from '../communication/hit-response';
import { ShotAcknowledgement } from '../communication/shot-acknowledgement';
import { Coordinate } from '../grid/coordinate';
import { GridRows } from '../grid/grid';
import { Optional } from '../utils/optional';

export interface Player<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    PlayerGridCell,
    OpponentGridCell,
> {
    readonly name: string;

    askMove(): Observable<Coordinate<ColumnIndex, RowIndex>>;

    sendResponse(response: HitResponse): Optional<ShotAcknowledgement>;

    askResponse(coordinates: Coordinate<ColumnIndex, RowIndex>): Optional<HitResponse>;

    getPlayerGridRows(): Readonly<GridRows<ColumnIndex, RowIndex, PlayerGridCell>>;

    getOpponentGridRows(): Readonly<GridRows<ColumnIndex, RowIndex, OpponentGridCell>>;
}
