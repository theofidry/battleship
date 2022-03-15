import { OpponentGrid } from '../../grid/opponent-grid';
import { AdaptablePlayer } from '../../player/adaptable-player';
import { HitStrategy } from '../../player/hit-strategy';
import { PlacementStrategy } from '../../player/placement-strategy';
import { Fleet } from '../../ship/fleet';
import { Cell as OpponentGridCell } from '../standard-opponent-grid';
import { Cell as PlayerGridCell } from '../standard-player-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';

export class InteractivePlayer extends AdaptablePlayer<StdColumnIndex, StdRowIndex, PlayerGridCell, OpponentGridCell> {
    constructor(
        name: string, fleet: Fleet,
        placementStrategy: PlacementStrategy<StdColumnIndex, StdRowIndex, PlayerGridCell>,
        hitStrategy: HitStrategy<StdColumnIndex, StdRowIndex, OpponentGridCell>,
        opponentGridFactory: ()=> OpponentGrid<StdColumnIndex, StdRowIndex, OpponentGridCell>,
    ) {
        super(name, fleet, placementStrategy, hitStrategy, opponentGridFactory);
    }
}
