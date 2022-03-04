import { Stringable } from '../utils/stringable';

export class Coordinate<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> implements Stringable {
    public constructor(
        public readonly columnIndex: ColumnIndex,
        public readonly rowIndex: RowIndex,
    ) {
    }

    toString(): string {
        return this.columnIndex.toString() + this.rowIndex.toString();
    }
}
