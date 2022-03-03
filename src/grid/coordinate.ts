export class Coordinate<ColumnIndex extends PropertyKey, RowIndex extends PropertyKey>{
    public constructor(
        public readonly columnIndex: ColumnIndex,
        public readonly rowIndex: RowIndex,
    ) {
    }
}
