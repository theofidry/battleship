import { HitResponse } from '../communication/hit-response';
import { ShotAcknowledgement } from '../communication/shot-acknowledgement';
import { Coordinate } from '../grid/coordinate';
import { Optional } from '../utils/optional';

export interface Player<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey> {
    readonly name: string;

    askMove(): Coordinate<ColumnIndex, RowIndex>;

    sendResponse(response: HitResponse): Optional<ShotAcknowledgement>;

    askResponse(coordinates: Coordinate<ColumnIndex, RowIndex>): Optional<HitResponse>;
}
