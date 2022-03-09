import readline from 'readline';
import {
    concatMap, filter, finalize, map, range, shareReplay, Subject, Subscription, switchMap, take,
    takeUntil, tap,
} from 'rxjs';
import { ConsoleLogger } from './logger/console-logger';
import { checkMaxTurn, endGameIfWinnerDecided, Match, playTurn, selectPlayer } from './match';
import { createFleet } from './ship/fleet';
import { createDumbPlayer } from './standard-grid/create-dump-player-factory';
import { createInteractivePlayer } from './standard-grid/create-interactive-player';
import { askTurn } from './standard-grid/hit-strategy/interactive-hit-strategy';
import { askTurn } from './standard-grid/hit-strategy/interactive-hit-strategy';
import { STD_COLUMN_INDICES } from './standard-grid/std-column-index';
import { STD_ROW_INDICES } from './standard-grid/std-row-index';
import readlineSync from 'readline-sync';

const match = new Match(new ConsoleLogger());
const fleet = createFleet();
const userInput = new Subject<string>();
const userInput$ = userInput.asObservable();

// const askTurnNode = (
//     callback: (answer: string)=> void
// ) => {
//     const readlineInterface = readline.createInterface(
//         process.stdin,
//         process.stdout,
//         undefined,
//         true,
//     );
//
//     readlineSync.question('Target: ', (answer) => {
//         readlineInterface.close();
//
//         return callback(answer);
//     });
// };

// const x = range(1, 3)
//     .pipe(
//         //tap((turn) => console.log(`Range ${turn}.`)),
//         // switchMap(() => userInput$),
//         tap((turn) => console.log(`Turn ${turn}.`)),
//         //tap((value) => console.log({ value })),
//         // tap(() => askTurnNode((answer) => userInput.next(answer))),
//         map(() => readlineSync.question('target: ')),
//         tap((answer) => console.log('anwser: ', answer)),
//         // takeUntil(playing),
//         // shareReplay(3),
//         finalize(() => console.log('finalized')),
//     )
//     .subscribe({
//         next: (next) => console.log('next', { next }),
//         error: (error) => console.log('error', { error }),
//         complete: () => console.log('complete'),
//     });
//
// function wait(subscription: Subscription, maxExecutionTimeInSeconds: number): void {
//     const waitTill = new Date(new Date().getTime() + maxExecutionTimeInSeconds * 1000);
//     console.log('wait until ' + waitTill.toISOString());
//     let now = new Date();
//     let max = 10;
//     let i = 0;
//
//     while(waitTill > now && !subscription.closed && i < max){
//         now = new Date();
//         i++;
//         console.log('wait: ' + now.toISOString());
//         // Do nothing:
//     }
// }
//
// wait(x, 1);

//
// const maxTurn = 3;
// const logger = new ConsoleLogger();
// const maxTurnOffset = maxTurn + 1;
// const playing = new Subject();
//
// const playerA = createDumbPlayer('A', fleet);
// const playerB = createDumbPlayer('B', fleet);
//
// logger.log(`Starting a match between the player "${playerA.name}" and "${playerB.name}".`);
//
// range(1, maxTurnOffset + 1)
//     .pipe(
//         takeUntil(playing),
//         tap((turn) => logger.log(`Turn ${turn}.`)),
//         concatMap((result) => {
//             return askTurn().pipe(
//                 tap((value) => console.log(value)),
//                 map(() => result),
//             );
//         }),
//         checkMaxTurn(maxTurn),
//         selectPlayer(playerA, playerB),
//         playTurn(logger),
//         endGameIfWinnerDecided(logger, playing),
//         shareReplay(maxTurnOffset),
//     )
//     .subscribe();

match
    .play(
        createDumbPlayer('A', fleet),
        createDumbPlayer('B', fleet),
        STD_COLUMN_INDICES.length * STD_ROW_INDICES.length * 2,
    )
    .subscribe();

//
//
// match
//     .play(
//         createDumbPlayer('A', fleet),
//         createInteractivePlayer(fleet),
//         3,
//         //EnumHelper.getValues(StdColumnIndex).length * EnumHelper.getValues(StdRowIndex).length * 2,
//     )
//     .subscribe();
