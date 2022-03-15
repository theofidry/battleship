import { Player } from '../player/player';
import { Cell as OpponentGridCell } from './standard-opponent-grid';
import { Cell as PlayerGridCell } from './standard-player-grid';
import { StdColumnIndex } from './std-column-index';
import { StdRowIndex } from './std-row-index';

export type StdPlayer = Player<StdColumnIndex, StdRowIndex, PlayerGridCell, OpponentGridCell>;
