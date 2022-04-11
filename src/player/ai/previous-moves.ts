import { List, OrderedMap } from 'immutable';
import { HitResponse } from '../../communication/hit-response';
import { Coordinate } from '../../grid/coordinate';
import { PreviousMove } from '../hit-strategy';

export class PreviousMoves<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> {
    #moves: OrderedMap<string, PreviousMove<ColumnIndex, RowIndex>> = OrderedMap();
    #knownCoordinates: List<Coordinate<ColumnIndex, RowIndex>> = List();
    #sunkCoordinates: List<Coordinate<ColumnIndex, RowIndex>> = List();
    #hitCoordinates: List<Coordinate<ColumnIndex, RowIndex>> = List();

    push(move: PreviousMove<ColumnIndex, RowIndex>): void {
        const coordinate = move.target;

        this.#moves = this.#moves.set(coordinate.toString(), move);

        switch (move.response) {
            case HitResponse.SUNK:
                this.#sunkCoordinates = this.#sunkCoordinates.push(coordinate);
                break;

            case HitResponse.HIT:
                this.#hitCoordinates = this.#hitCoordinates.push(coordinate);
                break;
        }

        this.#knownCoordinates = this.#knownCoordinates.push(coordinate);
    }

    get all(): List<PreviousMove<ColumnIndex, RowIndex>> {
        return this.#moves.valueSeq().toList();
    }

    get last(): PreviousMove<ColumnIndex, RowIndex> | undefined {
        return this.#moves.last();
    }

    get sunkCoordinates(): List<Coordinate<ColumnIndex, RowIndex>> {
        return this.#sunkCoordinates;
    }

    get hitCoordinates(): List<Coordinate<ColumnIndex, RowIndex>> {
        return this.#hitCoordinates;
    }

    get knownCoordinates(): List<Coordinate<ColumnIndex, RowIndex>> {
        return this.#knownCoordinates;
    }

    contains(coordinate: Coordinate<ColumnIndex, RowIndex>): boolean {
        return this.#moves.has(coordinate.toString());
    }
}
