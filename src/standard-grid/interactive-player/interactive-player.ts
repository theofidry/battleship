import { Observable } from 'rxjs';
import { Coordinate } from '../../grid/coordinate';
import { OpponentGrid } from '../../grid/opponent-grid';
import { AdaptablePlayer } from '../../player/adaptable-player';
import { HitStrategy } from '../../player/hit-strategy';
import { PlacementStrategy } from '../../player/placement-strategy';
import { Fleet } from '../../ship/fleet';
import { Cell } from '../standard-opponent-grid';
import { StdColumnIndex } from '../std-column-index';
import { StdRowIndex } from '../std-row-index';
import { PlayerGridPrinter } from './grid-printer';

export class InteractivePlayer extends AdaptablePlayer<StdColumnIndex, StdRowIndex, Cell> {
    constructor(
        name: string, fleet: Fleet,
        placementStrategy: PlacementStrategy<StdColumnIndex, StdRowIndex>,
        hitStrategy: HitStrategy<StdColumnIndex, StdRowIndex, Cell>,
        opponentGridFactory: ()=> OpponentGrid<StdColumnIndex, StdRowIndex, Cell>,
        private readonly printGrid: PlayerGridPrinter,
    ) {
        super(name, fleet, placementStrategy, hitStrategy, opponentGridFactory);
    }

    override askMove(): Observable<Coordinate<StdColumnIndex, StdRowIndex>> {
        this.printGrid(this);

        return super.askMove();
    }
}
