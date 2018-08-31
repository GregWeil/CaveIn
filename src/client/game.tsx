/// game.tsx
// Handles pages where the game is visible

import { h, Component } from 'hyperapp';

import { State, Actions } from './actions';
import Game from '../game/game';
import Replay from '../game/replay';
import * as Input from '../engine/input';

export interface WrappedGame {
  render(): void;
  destructor(): void;
};

export async function createPlayable(save: Replay|null, best: number) {
  const game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best
  });
  
  /*
  game.onCommandCheck.listen(evt => {
    if (overlayCurrent) {
      evt.accept = false;
    }
  }, Infinity);
  */
  game.onPlayerDied.listen(() => {
    //setTimeout(() => overlay('game-over'), 1000);
  });
  
  if (save) {
    try {
      const executor = save.getExecutor(game);
      game.silent = true;
      await executor.execute(2500, -100);
      await executor.execute(500, -5);
      game.silent = false;
      await executor.execute(5, -1);
      await executor.execute(1.5);
    } catch (e) {
      // Don't leave the player in a broken game
      //navigate('title');
      throw e;
    }
  } else {
    save = new Replay(game.randomSeed);
  }
  
  save.record(game, (replay, replayGame) => {
    if (replayGame == game) {
      //Save.saveReplay(replay);
    }
  });
  
  const input = new Input.InputQueued([
    new Input.InputKeyboard({
      'KeyW': 'up',
      'KeyA': 'left',
      'KeyS': 'down',
      'KeyD': 'right',

      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right',

      'Space': 'action'
    }),
    new Input.InputSwipe(game.canvas, [
      'right', null, 'down', null,
      'left', null, 'up', null,
    ], 'action'),
  ]);
  input.listen(command => {
    if (game.commandCheck(command)) {
      game.update(command);
    }
  });
}

const GameArea = () => (
  <div id="-game-page" class="page">
    <div class="centered">
      <div class="area">

        <canvas id="canvas" width="480" height="320"></canvas>

        <div id="game-pause" class="centered overlay">
          <p><span class="inverse">PAUSED</span></p>
          <p><span class="inverse"><a data-onclick="pause">RESUME</a> or <a href="#title">TITLE</a></span></p>
          <p class="small"><span class="inverse">
            <span class="show-if-music-loading">loading music</span>
            <a data-onclick="enable-music" class="hide-if-music-enabled">enable music</a>
            <a data-onclick="disable-music" class="hide-if-music-disabled">disable music</a>
            -
            <a data-onclick="enter-fullscreen" class="hide-if-fullscreen-enabled">fullscreen</a>
            <a data-onclick="exit-fullscreen" class="hide-if-fullscreen-disabled">exit fullscreen</a>
          </span></p>
        </div>

        <div id="game-over" class="centered overlay">
          <p><span class="inverse">GAME OVER</span></p>
          <p><span class="inverse"><a href="#newgame">RETRY</a> or <a href="#title">TITLE</a></span></p>
        </div>
      </div>
    </div>
  </div>
);

export const GamePage: Component<{}, State, Actions> = () => (state) => (
  <GameArea/>
);

export const ReplayPage: Component<{}, State, Actions> = () => (state) => (
  <GameArea/>
);