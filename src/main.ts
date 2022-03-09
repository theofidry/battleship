import readline from 'readline';
import { bindCallback, concatMap, range, switchMap, tap } from 'rxjs';
import { ConsoleLogger } from './logger/console-logger';
import { Match } from './match';
import { createFleet } from './ship/fleet';
import { createDumbPlayer } from './standard-grid/create-dump-player';
import { createInteractivePlayer } from './standard-grid/create-interactive-player';
import { StdColumnIndex } from './standard-grid/std-column-index';
import { StdRowIndex } from './standard-grid/std-row-index';
import { EnumHelper } from './utils/enum-helper';

const match = new Match(new ConsoleLogger());
const fleet = createFleet();

// const question = (
//     query: string,
//     callback: (answer: string)=> void
// ) => {
//     const readlineInterface = readline.createInterface(
//         process.stdin,
//         process.stdout,
//         undefined,
//         true,
//     );
//
//     readlineInterface.question(query, (answer) => {
//         readlineInterface.close();
//
//         return callback(answer);
//     });
// };
//
// range(0, 3)
//     .pipe(
//         concatMap(() => bindCallback(question)('Target: ')),
//         tap((value) => console.log(value)),
//     )
//     .subscribe();



match
    .play(
        createDumbPlayer('A', fleet),
        createInteractivePlayer(fleet),
        3,
        //EnumHelper.getValues(StdColumnIndex).length * EnumHelper.getValues(StdRowIndex).length * 2,
    )
    .subscribe();
