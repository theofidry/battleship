import { Observable } from 'rxjs';
import { HitResponse } from '../communication/hit-response';
import { Coordinate } from '../grid/coordinate';
import { OpponentGrid } from '../grid/opponent-grid';

export type PreviousMove<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = {
    target: Coordinate<ColumnIndex, RowIndex>,
    response: HitResponse,
};

export type HitDecider<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> = (
    grid: OpponentGrid<ColumnIndex, RowIndex, Cell>,
    previousMove: PreviousMove<ColumnIndex, RowIndex> | undefined,
)=> Observable<Coordinate<ColumnIndex, RowIndex>>;

export interface HitStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> {
    decide: HitDecider<ColumnIndex, RowIndex, Cell>;
}
