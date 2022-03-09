import readlineSync from 'readline-sync';
import { Observable, of } from 'rxjs';
import { Coordinate } from '../../grid/coordinate';
import { OpponentGrid } from '../../grid/opponent-grid';
import { HitStrategy } from '../../player/hit-strategy';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';

export class InteractiveHitStrategy implements HitStrategy<StdColumnIndex, StdRowIndex, Cell> {
    constructor(
        private readonly coordinateParser: CoordinateParser,
    ) {
    }

    decide (_grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>): Observable<Coordinate<StdColumnIndex, StdRowIndex>> {
        const target = readlineSync.question('Target: ');

        return of(this.coordinateParser(target));
    }
}

export type CoordinateParser = (value: string)=> Coordinate<StdColumnIndex, StdRowIndex>;
