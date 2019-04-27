/// main.tsx
//Define the different pages and how they interact

import { render, h, Component } from 'preact';

import { FullscreenManager } from './fullscreen';
import { ReplayValidatorManager } from './validator';
import { Router } from './router';
import { SaveManager } from './save';
import { MusicManager } from './music';

import TitlePage from './title';
import TutorialPage from './tutorial';
import GamePage from './game';
import ReplayPage from './replay';

const Main = () => (
  <FullscreenManager>
    <ReplayValidatorManager>
      <SaveManager>
        <MusicManager>
          <Router render={(page, key) => {
            switch (page) {
              case '#title':
                return <TitlePage key={key}/>;
              case '#tutorial':
                return <TutorialPage key={key}/>;
              case '#game':
                return <GamePage key={key}/>;
              case '#replay':
                return <ReplayPage key={key}/>;
            }
            return <TitlePage key={key}/>;
          }} />
        </MusicManager>
      </SaveManager>
    </ReplayValidatorManager>
  </FullscreenManager>
);

render(<Main/>, document.body);