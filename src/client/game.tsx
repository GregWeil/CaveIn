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

const GameLayout = ({children}: {children: VNode}) => (
  <div id="-game-page" class="page">
    <div class="centered">
      <div class="area">


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

        <div id="game-over" class="centered overlay">
          <p><span class="inverse">GAME OVER</span></p>
          <p><span class="inverse"><a href="#game">RETRY</a> or <a href="#title">TITLE</a></span></p>
        </div>
      </div>
    </div>
  </div>
);

export const GamePage = () => (
  <GameArea/>
);

export const ReplayPage = () => (
  <GameArea/>
);