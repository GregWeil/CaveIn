/// game.tsx
// Handles pages where the game is visible

import { h, Component } from 'hyperapp';

import { State, Actions } from './actions';
import * as Wrapper from './wrapper';

const GameArea = () => (
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
);

export const Game: Component<{}, State, Actions> = () => (state) => (
  <div id="game-page" class="page"
    oncreate={() => Wrapper.createPlayable()}
    ondestroy={() => Wrapper.destroy()}
  >
    <GameArea/>
  </div>
);

export const Replay: Component<{}, State, Actions> = () => (state) => (
  <div id="game-page" class="page"
    oncreate={() => Wrapper.createWatchable()}
    ondestroy={() => Wrapper.destroy()}
  >
    <GameArea/>
  </div>
);