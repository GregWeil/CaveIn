/// wrapper.ts
//Provide simple functions for game management

import Vector2 from '../engine/vector2';
import Replay from '../game/replay';
import * as Game from '../game/game';
import * as Save from './save';
import { navigate } from './pages';

//Player game state

let game: any|null = null;

//Manipulate the player's game

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
  if (game) resize();
});

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

function pause() {
  if (overlayCurrent === 'game-pause') {
    overlay();
  } else if (!overlayCurrent) {
    overlay('game-pause');
  }
}

function keyPause(evt: KeyboardEvent) {
  if (evt.key === 'Escape') {
    pause();
  }
}

function touchPause(evt: Event) {
  if (!overlayCurrent && evt.target === document.body) {
    pause();
  }
}

export async function createPlayable() {
  overlay();
  let save = await Save.getSave();
  let best = await Save.getBestScore();
  
  game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best, locked: true
  });
  resize();
  
  game.on('command-check', (evt: any) => {
    if (overlayCurrent) {
      evt.data.accept = false;
    }
  }, undefined, Infinity);
  
  game.on('player-died', () => {
    setTimeout(() => overlay('game-over'), 1000);
  });
  
  if (save) {
    const executor = save.getExecutor(game);
    game.silent = true;
    await executor.execute(2500, -100);
    await executor.execute(500, -5);
    game.silent = false;
    await executor.execute(5, -1);
    await executor.execute(1.5);
  } else {
    save = new Replay(game.randomSeed);
  }
  
  save.record(game, (replay, replayGame) => {
    if (replayGame == game) {
      Save.saveReplay(replay);
    }
  });
  window.addEventListener('keydown', keyPause);
  document.body.addEventListener('touchstart', touchPause);
  game.locked = false;
}

export async function createWatchable() {
  overlay();
  const save = await Save.getBest();
  
  if (!save) {
    navigate('title');
    return;
  }
  
  game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save.seed, best: save.score,
    locked: true
  });
  resize();
  
  await save.execute(game, 5);
  await new Promise((resolve, reject) => setTimeout(resolve, 3000));
  
  navigate('title');
}

export function destroy() {
  window.removeEventListener('keydown', keyPause);
  document.body.removeEventListener('touchstart', touchPause);
  game && game.destructor();
  game = null;
  overlay();
}