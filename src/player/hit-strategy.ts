import { Observable } from 'rxjs';
import { Coordinate } from '../grid/coordinate';
import { OpponentGrid } from '../grid/opponent-grid';

export type HitDecider<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> = (grid: OpponentGrid<ColumnIndex, RowIndex, Cell>)=> Observable<Coordinate<ColumnIndex, RowIndex>>;

export interface HitStrategy<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> {
    decide: HitDecider<ColumnIndex, RowIndex, Cell>;
}
