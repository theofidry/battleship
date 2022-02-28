import { Game } from '@app/Game';
import { Grid } from '@app/grid/Grid';
import { createDumbPlayer } from '@app/player/AdaptablePlayer';
import { Player } from '@app/player/Player';
import { createFleet } from '@app/ship/Fleet';

const game = new Game(
    createDumbPlayer('A', new Grid(), createFleet()),
    createDumbPlayer('B', new Grid(), createFleet()),
);
const maxTurn = 10 * 10;  // There cannot be more turn than grid size

let turn = 0;
let winner: Player | null;
console.log(`Starting a game between the player ${game.playerA.name} and ${game.playerB.name}`);

while (true) {
    turn++;

    console.log(`Turn ${turn}`);

    winner = game.getWinner();

    if (null !== winner) {
        console.log(`Game finished! The winner is ${winner.name}`);

        break;
    }

    if (turn > maxTurn) {
        console.log(`ERROR: the game could not be finished within 100 turns.`);

        break;
    }

    game.playTurn();
}
