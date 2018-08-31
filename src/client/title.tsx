/// title.tsx
// The title screen for the game

import { h, Component } from 'hyperapp';
import { State, Actions } from './actions';

import { FullscreenToggle } from './settings';

const Divider = () => ' - ';

const Title: Component<{}, State, Actions> = () => (state, actions) => (
  <div id="-title-page" class="page centered">
    <div class="glitchButton"></div>
    <a id="boxart" href="#game">
      <img src="/assets/boxart.png" class="smooth"/>
    </a>
    <p>
      {!!state.save && !!state.validated.get(state.save) && [<a href="#game">continue</a>, <Divider/>]}
      {!!state.save && !state.validated.has(state.save) && ['checking save', <Divider/>]}
      <a href="#game" onclick={actions.clearSave}>start a new game</a>
      {!!state.best && !!state.validated.get(state.best) && [<Divider/>, <a href="#replay">best score {state.best.score}</a>]}
      {!!state.best && !state.validated.has(state.best) && [<Divider/>, 'checking best']}
    </p>
    <p>
      <span class="show-if-music-loading">loading music</span>
      <a data-onclick="enable-music" class="hide-if-music-enabled">enable music</a>
      <a data-onclick="disable-music" class="hide-if-music-disabled">disable music</a>
      <Divider/>
      <FullscreenToggle fullscreen={state.fullscreen}/>
    </p>
    <p><a href="#tutorial">instructions</a></p>
    <p>made for Ludum Dare 37 "One Room"</p>
    <p>coding by Greg Weil | art and sound by Devin Hilpert</p>
  </div>
);

export default Title;