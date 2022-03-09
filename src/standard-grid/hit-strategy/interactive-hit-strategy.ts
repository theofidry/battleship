import { isError } from 'lodash';
import readlineSync from 'readline-sync';
import { catchError, map, Observable, of, retry, throwError } from 'rxjs';
import { Coordinate } from '../../grid/coordinate';
import { OpponentGrid } from '../../grid/opponent-grid';
import { Logger } from '../../logger/logger';
import { HitStrategy } from '../../player/hit-strategy';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';

export class InteractiveHitStrategy implements HitStrategy<StdColumnIndex, StdRowIndex, Cell> {
    constructor(
        private readonly coordinateParser: CoordinateParser,
        private readonly logger: Logger,
    ) {
    }

    decide (_grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>): Observable<Coordinate<StdColumnIndex, StdRowIndex>> {
        return of(undefined)
            .pipe(
                map(() => readlineSync.question('Target: ')),
                map(this.coordinateParser),
                catchError((error) => {
                    if (isError(error)) {
                        this.logger.log(`Invalid coordinate: ${error.message}`);
                    }

                    return throwError(error);
                }),
                retry(1000),
            );
    }
}

export type CoordinateParser = (value: string)=> Coordinate<StdColumnIndex, StdRowIndex>;
