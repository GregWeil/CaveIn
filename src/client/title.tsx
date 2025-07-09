/// title.tsx
// The title screen for the game

import { h, FunctionalComponent } from 'preact';

import Replay from '../game/replay';

import { SaveConsumer } from './save';
import { ReplayValidatorConsumer } from './validator';

import { FullscreenToggle } from './fullscreen';
import { MusicToggle } from './music';

interface Props {
  save: Replay|null;
  best: Replay|null;
  validate: (replay: Replay) => boolean|null;
}

const TitlePageImpl = ({save, best, validate}: Props) => (
  <div id="title-page" class="page centered">
    <div class="glitchButton"></div>
    <a id="boxart" href="#game">
      <img src="assets/boxart.png" class="smooth"/>
    </a>
    <p>
      {!!save && validate(save) && [<a href="#game">continue</a>, ' - ']}
      {!!save && (validate(save) === null) && ['checking save', ' - ']}
      <a href="#game">start a new game</a>
      {!!best && validate(best) && [' - ', <a href="#replay">best score {best.score}</a>]}
      {!!best && (validate(best) === null) && [' - ', 'checking best']}
    </p>
    <p>
      <MusicToggle/>
      {' - '}
      <FullscreenToggle/>
    </p>
    <p><a href="#tutorial">instructions</a></p>
    <p>made for Ludum Dare 37 "One Room"</p>
    <p>code by Greg Weil | art and sound by Devin Hilpert</p>
  </div>
);

const TitlePage: FunctionalComponent = () => (
  <SaveConsumer>
    {({save, best}) => (
      <ReplayValidatorConsumer>
        {validate => <TitlePageImpl save={save} best={best} validate={validate}/>}
      </ReplayValidatorConsumer>
    )}
  </SaveConsumer>
);

export default TitlePage;
