import * as inquirer from 'inquirer';
import * as readline from 'readline';
import {
    bindCallback, bindNodeCallback, debounceTime, from, map, Observable, Subject, tap,
} from 'rxjs';
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
        return bindCallback(question)('Target: ')
            .pipe(
                debounceTime(2000),
                tap(() => console.log('HELLO')),
                map((value) => this.coordinateParser(value as unknown as string)),
            );
    }
}

export type CoordinateParser = (value: string)=> Coordinate<StdColumnIndex, StdRowIndex>;

const question = (
    query: string,
    callback: (answer: string)=> void
) => {
    const readlineInterface = readline.createInterface(
        process.stdin,
        process.stdout,
        undefined,
        true,
    );

    readlineInterface.question(query, (answer) => {
        readlineInterface.close();

        return callback(answer);
    });
};
