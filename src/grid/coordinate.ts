import { Index } from './grid';

export class Coordinate<ColumnIndex extends Index, RowIndex extends Index>{
    public constructor(
        public readonly columnIndex: ColumnIndex,
        public readonly rowIndex: RowIndex,
    ) {
    }
}
