/// title.tsx
// The title screen for the game

import { h, Component } from 'hyperapp';
import { State, Actions } from './actions';

import { fullscreenEnter, fullscreenExit } from './settings';

const Title: Component<{}, State, Actions> = () => (state, actions) => (
  <div id="-title-page" class="page centered">
    <div class="glitchButton"></div>
    <a id="boxart" href="#game">
      <img src="/assets/boxart.png" class="smooth"/>
    </a>
    <p>
      {state.save && !!save.validated.get(save) && [<a href="#game">continue</a>, ' -']}
      {!!state.save && !save.validated.has(save) && ['checking save -']}
      <a href="#newgame">start a new game</a>
      <span class="best loading">- checking best</span>
      <span class="best exists">- <a href="#replay">best score <span class="score"></span></a></span>
    </p>
    <p>
      <span class="show-if-music-loading">loading music</span>
      <a data-onclick="enable-music" class="hide-if-music-enabled">enable music</a>
      <a data-onclick="disable-music" class="hide-if-music-disabled">disable music</a>
      - {!state.fullscreen ? (
        <a onclick={fullscreenEnter}>fullscreen</a>
      ) : (
        <a onclick={fullscreenExit}>exit fullscreen</a>
      )}
    </p>
    <p><a href="#tutorial">instructions</a></p>
    <p>made for Ludum Dare 37 "One Room"</p>
    <p>coding by Greg Weil | art and sound by Devin Hilpert</p>
  </div>
);

export default Title;