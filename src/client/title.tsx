/// title.tsx
// The title screen for the game

import { h, Fragment } from 'preact';

import { FullscreenToggle } from './fullscreen';

const Divider = () => ' - ';

const Title = (state: any) => (
  <div id="-title-page" class="page centered">
    <div class="glitchButton"></div>
    <a id="boxart" href="#game">
      <img src="/assets/boxart.png" class="smooth"/>
    </a>
    <p>
      {!!state.save && !!state.validated.get(state.save) && <Fragment><a href="#game">continue</a><Divider/></Fragment>}
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
      <FullscreenToggle/>
    </p>
    <p><a href="#tutorial">instructions</a></p>
    <p>made for Ludum Dare 37 "One Room"</p>
    <p>coding by Greg Weil | art and sound by Devin Hilpert</p>
  </div>
);

export default Title;