/// wrapper.ts
//Provide simple functions for game management

import Vector2 from '../engine/vector2';
import Engine from '../engine/engine';
import * as Input from '../engine/input';
import Replay from '../game/replay';
import Game from '../game/game';
import * as Save from './save';
import { navigate } from './pages';

//Player game state

let activeGame: Engine|null = null;
let activeInput: Input.Input|null = null;

// Resize to fit the screen

function resize() {
  const pixel = window.devicePixelRatio;
  const canvas = document.querySelector('#game-page .area') as HTMLCanvasElement;
  canvas.style.transform = '';
  const sizeCanvas = new Vector2(canvas.offsetWidth, canvas.offsetHeight);
  const sizeWindow = new Vector2(window.innerWidth, window.innerHeight);
  const scaleAxes = sizeWindow.divide(sizeCanvas.divide(pixel));
  let scale = Math.min(scaleAxes.x, scaleAxes.y);
  if (scale > 1) {
    scale = Math.floor(scale);
  } else if (scale < 1) {
    scale = (1 / Math.ceil(1 / scale));
  }
  canvas.style.transform = ('scale(' + (scale / pixel) + ')');
}
window.addEventListener('resize', () => {
  if (activeGame) resize();
});

// Popups over the game (pause/gameover)

let overlayCurrent: string|null = null;
function overlay(name?: string) {
  document.querySelectorAll('#game-page .overlay')
    .forEach(e => e.classList.add('hidden'));
  if (name) {
    overlayCurrent = name;
    document.getElementById(name)!.classList.remove('hidden');
  } else {
    overlayCurrent = null;
  }
}

// Pause event handling

function pause() {
  if (!activeGame) return;
  if (overlayCurrent === 'game-pause') {
    overlay();
  } else if (!overlayCurrent) {
    overlay('game-pause');
  }
}
window.addEventListener('keydown', evt => {
  if (evt.key === 'Escape') {
    pause();
  }
});
document.body.addEventListener('touchstart', evt => {
  if (!overlayCurrent && evt.target === document.body) {
    pause();
  }
});
document.addEventListener('click', evt => {
  const target = (evt.target as HTMLElement).closest('a');
  if (target && target.hasAttribute('data-onclick-pause')) {
    pause();
  }
});

// Game management

export async function createPlayable() {
  overlay();
  let save = await Save.getSave();
  let best = await Save.getBestScore();
  
  const game = activeGame = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best
  });
  resize();
  
  game.on('command-check', evt => {
    if (overlayCurrent) {
      evt.data.accept = false;
    }
  }, undefined, Infinity);
  
  game.on('player-died', () => {
    setTimeout(() => overlay('game-over'), 1000);
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
      navigate('title');
      throw e;
    }
  } else {
    save = new Replay(game.randomSeed);
  }
  
  save.record(game, (replay, replayGame) => {
    if (replayGame == game) {
      Save.saveReplay(replay);
    }
  });
  
  activeInput = new Input.InputQueued([
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
      'left', null, 'up', null
    ], 'action'),
  ]);
  activeInput.on('command', evt => {
    if (game.commandCheck(evt.data.command)) {
      game.update(evt.data.command);
    }
  });
}

export async function createWatchable() {
  overlay();
  const save = await Save.getBest();
  
  if (!save) {
    navigate('title');
    return;
  }
  
  const game = activeGame = new Game({
    canvas: document.getElementById('canvas'),
    seed: save.seed, best: save.score,
  });
  resize();
  
  try {
    await save.execute(game, 5);
    await new Promise(resolve => setTimeout(resolve, 3000));
  } finally {
    navigate('title');
  }
}

export function destroy() {
  activeInput && activeInput.destructor();
  activeGame && activeGame.destructor();
  activeGame = null;
  overlay();
}