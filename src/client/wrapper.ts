/// wrapper.ts
//Provide simple functions for game management

import Vector2 from '../engine/vector2';
import Replay from '../game/replay';
import * as Game from '../game/game';
import * as Save from './save';

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
let overlayAction: any|null = null;
function overlay(name: string, action) {
  document.querySelectorAll('#game-page .overlay')
    .forEach(e => e.classList.add('hidden'));
  if (name) {
    overlayCurrent = name;
    overlayAction = action;
    document.getElementById(name).classList.remove('hidden');
  } else {
    overlayCurrent = null;
    overlayAction = null;
  }
}

window.pause = function pause(evt) {
  var evtCanPause = !evt ||
    (evt.type.startsWith('key') && evt.key === 'Escape') ||
    (evt.type.startsWith('touch') && evt.target === document.body);
  var evtCanResume = !evt || evt.key === 'Escape';
  if (evtCanPause && !overlayCurrent) {
    overlay('game-pause');
  } else if (evtCanResume && overlayCurrent === 'game-pause') {
    overlay();
  }
};

export async function createPlayable(config) {
  overlay();
  var save = await Save.getSave();
  var best = await Save.getBestScore();
  
  game = new Game({
    canvas: document.getElementById('canvas'),
    seed: save ? save.seed : null,
    best: best, locked: true
  });
  resize();
  
  game.on('command-check', function (evt) {
    if (overlayCurrent) {
      evt.data.accept = false;
      if (overlayAction && evt.data.command === 'action') {
        overlayAction();
      }
    }
  }, undefined, Infinity);
  
  game.on('player-died', function() {
    window.setTimeout(function() {
      overlay('game-over', config.onRetry);
    }, 1000);
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
  window.addEventListener('keydown', window.pause);
  document.body.addEventListener('touchstart', window.pause);
  game.locked = false;
}

export function destroyPlayable() {
  window.removeEventListener('keydown', window.pause);
  document.body.removeEventListener('touchstart', window.pause);
  game && game.destructor();
  game = null;
}

export async function createWatchable(config) {
  overlay();
  var save = await Save.getBest();
  if (!save) {
    config.onComplete();
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
  
  config.onComplete();
}

export function destroyWatchable() {
  game && game.destructor();
  game = null;
}