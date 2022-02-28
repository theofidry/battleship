import { ShotAcknowledgement } from '@app/communications/ShotAcknowledgement';
import { ShotResponse } from '@app/communications/ShotResponse';
import { Coordinate } from '@app/grid/Coordinate';

export interface Player {
    name: string;

    askMove(): Coordinate;

    sendResponse(response: ShotResponse): ShotAcknowledgement;

    askResponse(coordinates: Coordinate): ShotResponse;
}
