import readlineSync from 'readline-sync';
import { map, Observable, of, retry } from 'rxjs';
import { Coordinate } from '../../grid/coordinate';
import { OpponentGrid } from '../../grid/opponent-grid';
import { Logger } from '../../logger/logger';
import { HitStrategy } from '../../player/hit-strategy';
import { Either } from '../../utils/either';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';

export class InteractiveHitStrategy implements HitStrategy<StdColumnIndex, StdRowIndex, Cell> {
    constructor(
        private readonly parseCoordinate: CoordinateParser,
        private readonly logger: Logger,
    ) {
    }

    decide (_grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>): Observable<Coordinate<StdColumnIndex, StdRowIndex>> {
        return of(undefined)
            .pipe(
                map(() => readlineSync.question('Target: ')),
                map((value) => this
                    .parseCoordinate(value)
                    .fold(
                        (error) => this.handleInvalidCoordinate(error),
                        (coordinate) => coordinate,
                    )
                ),
                retry(1000),
            );
    }

    private handleInvalidCoordinate(error: Error): never {
        this.logger.log(`Invalid coordinate: ${error.message}`);

        throw error;
    }
}

export type CoordinateParser = (value: string)=> Either<Error, Coordinate<StdColumnIndex, StdRowIndex>>;
