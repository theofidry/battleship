import * as inquirer from 'inquirer';
import { HitResponse } from '../communication/hit-response';
import { ShotAcknowledgement } from '../communication/shot-acknowledgement';
import { Coordinate } from '../grid/coordinate';
import { Optional } from '../utils/optional';
import { Player } from './player';

export class InteractivePlayer<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
    Cell,
> implements Player<ColumnIndex, RowIndex> {
    readonly name: string;

    constructor(
        private readonly coordinateParser: CoordinateParser<ColumnIndex, RowIndex>,
    ) {
    }

    askMove(): Coordinate<ColumnIndex, RowIndex> {
        await inquirer
            .prompt([
                {
                    message: 'Target',
                    type: 'input',
                },
            ])
            .then((answers) => console.log(answers))
            .catch(() => {
                throw new Error('failed!');
            });

        return undefined;
    }

    askResponse(coordinates: Coordinate<ColumnIndex, RowIndex>): Optional<HitResponse> {
        return undefined;
    }

    sendResponse(response: HitResponse): Optional<ShotAcknowledgement> {
        return undefined;
    }

}

type CoordinateParser<
    ColumnIndex extends PropertyKey,
    RowIndex extends PropertyKey,
> = (value: string)=> Coordinate<ColumnIndex, RowIndex>;
