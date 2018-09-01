/// game.tsx
// Handles pages where the game is visible

import { h, Component, VNode } from 'preact';

import Game from '../game/game';
import Replay from '../game/replay';
import * as Input from '../engine/input';

import { FullscreenToggle } from './fullscreen';

const GameCanvas = () => (
  <canvas id="-canvas" width="480" height="320"></canvas>
);

class GameLayout extends Component<{children: VNode}, > {
  resize() {
    const pixel = window.devicePixelRatio;
    const canvas = document.querySelector('#canvas') as HTMLCanvasElement;
    const sizeCanvas = new Vector2(canvas.width, canvas.height);
    const sizeWindow = new Vector2(window.innerWidth, window.innerHeight);
    const scaleAxes = sizeWindow.divide(sizeCanvas.divide(pixel));
    let scale = Math.min(scaleAxes.x, scaleAxes.y);
    if (scale > 1) {
      scale = Math.floor(scale);
    } else if (scale < 1) {
      scale = (1 / Math.ceil(1 / scale));
    }
    const area = canvas.closest('.area') as HTMLElement;
    area.style.transform = `scale(${scale / pixel})`;
  }
  render({children}: {children: VNode}) {
    return (
      <div id="-game-page" class="page">
        <div class="centered">
          <div class="area" ref={node => this.node = node}>
            {children}
          </div>
        </div>
      </div>
    );
  }
}

const PauseOverlay = () => (
  <div id="game-pause" class="centered overlay">
    <p><span class="inverse">PAUSED</span></p>
    <p><span class="inverse"><a data-onclick="pause">RESUME</a> or <a href="#title">TITLE</a></span></p>
    <p class="small"><span class="inverse">
      <span class="show-if-music-loading">loading music</span>
      <a data-onclick="enable-music" class="hide-if-music-enabled">enable music</a>
      <a data-onclick="disable-music" class="hide-if-music-disabled">disable music</a>
      {' - '}
      <FullscreenToggle/>
    </span></p>
  </div>
);

const GameOverOverlay = () => (
  <div id="game-over" class="centered overlay">
    <p><span class="inverse">GAME OVER</span></p>
    <p><span class="inverse"><a href="#game">RETRY</a> or <a href="#title">TITLE</a></span></p>
  </div>
);

export const GamePage = () => (
  <GameLayout>
    <GameCanvas/>
    <PauseOverlay/>
    <GameOverOverlay/>
  </GameLayout>
);

export const ReplayPage = () => (
  <GameLayout>
    <GameCanvas/>
    <PauseOverlay/>
    <GameOverOverlay/>
  </GameLayout>
);