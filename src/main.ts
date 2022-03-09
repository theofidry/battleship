import { concatMap, range, shareReplay, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { ConsoleLogger } from './logger/console-logger';
import { Match } from './match';
import { createFleet } from './ship/fleet';
import { createDumbPlayer } from './standard-grid/dump-player-factory';
import { askTurn, askTurnNode } from './standard-grid/hit-strategy/interactive-hit-strategy';
import { STD_COLUMN_INDICES } from './standard-grid/std-column-index';
import { STD_ROW_INDICES } from './standard-grid/std-row-index';

const match = new Match(new ConsoleLogger());
const fleet = createFleet();

const playing = new Subject();
const userInput = new Subject<string>();

// range(1, 3)
//     .pipe(
//         concatMap(() => askTurn()),
//         //tap(() => askTurnNode((answer) => userInput.next(answer))),
//         //switchMap(() => askTurn()),
//         // takeUntil(playing),
//         // shareReplay(3),
//     )
//     .subscribe({
//         next: (next) => console.log({ next }),
//         error: (error) => console.log({ error }),
//         complete: () => console.log('complete'),
//     });

match
    .play(
        createDumbPlayer('A', fleet),
        createDumbPlayer('B', fleet),
        STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
    )
    .subscribe();
