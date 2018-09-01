/// game.tsx
// Handles pages where the game is visible

import { h, Component, ComponentChildren } from 'preact';

import Game from '../game/game';
import Replay from '../game/replay';
import * as Input from '../engine/input';
import Vector2 from '../engine/vector2';

import { FullscreenToggle } from './fullscreen';
import { ReplayValidatorConsumer } from './validator';
import { SaveConsumer } from './save';

const GameCanvas = () => (
  <canvas id="-canvas" width="480" height="320"></canvas>
);

class GameLayout extends Component<{children: ComponentChildren}, {scale: number}> {
  state = {scale: 1}
  node: HTMLElement|null = null
  resize() {
    if (!this.node) return;
    const pixel = window.devicePixelRatio;
    const sizeArea = new Vector2(this.node.offsetWidth, this.node.offsetHeight);
    const sizeWindow = new Vector2(window.innerWidth, window.innerHeight);
    const scaleAxes = sizeWindow.divide(sizeArea.divide(pixel));
    let scale = Math.min(scaleAxes.x, scaleAxes.y);
    if (scale > 1) {
      scale = Math.floor(scale);
    } else if (scale < 1) {
      scale = (1 / Math.ceil(1 / scale));
    }
    this.setState({scale: scale / pixel});
  }
  componentDidMount() {
    this.resize = this.resize.bind(this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }
  componentWillUnmount() {
    window.removeEventListener('resize', this.resize);
  }
  render() {
    const {scale} = this.state;
    return (
      <div id="-game-page" class="page">
        <div class="centered">
          <div class="area" style={{transform: `scale(${scale})`}} ref={node => this.node = node}>
            {this.props.children}
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

const ReplayPageImpl = ({replay: Replay, validated: boolean, best: number|null) => (
  <GameLayout>
    <GameCanvas/>
    <PauseOverlay/>
    <GameOverOverlay/>
  </GameLayout>
);

export const ReplayPage = () => (
  <ReplayValidatorConsumer>
    {validator => (
      <SaveConsumer>
        {({best}) => (
          best ? (
            <ReplayPageImpl replay={best} validated={validator(replay)}
          ) : (
            null
          )
        )}
      </SaveConsumer>
    )}
  </ReplayValidatorConsumer>
);