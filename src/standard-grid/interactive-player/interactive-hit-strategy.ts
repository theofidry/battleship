import readlineSync from 'readline-sync';
import { map, Observable, of, retryWhen, takeWhile } from 'rxjs';
import { isNonNullObject } from '../../assert/assert-is-non-null-object';
import { Coordinate } from '../../grid/coordinate';
import { OpponentGrid } from '../../grid/opponent-grid';
import { Logger } from '../../logger/logger';
import { HitStrategy } from '../../player/hit-strategy';
import { Either } from '../../utils/either';
import { hasOwnProperty } from '../../utils/has-own-property';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';

export class InteractiveHitStrategy implements HitStrategy<StdColumnIndex, StdRowIndex, Cell> {
    constructor(
        private readonly parseCoordinate: CoordinateParser,
        private readonly logger: Logger,
    ) {
    }

    decide(_grid: OpponentGrid<StdColumnIndex, StdRowIndex, Cell>): Observable<Coordinate<StdColumnIndex, StdRowIndex>> {
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
                retryWhen((errors) => errors.pipe(
                    takeWhile((error) => {
                        if (isInterruptError(error)) {
                            throw error;
                        }

                        return true;
                    })
                )),
            );
    }

    private handleInvalidCoordinate(error: Error): never {
        this.logger.log(`Invalid coordinate: ${error.message}`);

        throw error;
    }
}

export type CoordinateParser = (value: string)=> Either<Error, Coordinate<StdColumnIndex, StdRowIndex>>;

export const interruptDiscriminant = 'InterruptError';

export interface InterruptError extends Error {
    readonly discriminant: 'InterruptError';
}

function isInterruptError(error: unknown): error is InterruptError {
    return isNonNullObject(error)
        && hasOwnProperty(error, 'discriminant')
        && error['discriminant'] === 'InterruptError';
}
