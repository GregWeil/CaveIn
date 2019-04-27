/// layout.tsx
// Utility components for the game pages

import { h, Component, ComponentChild, ComponentChildren, FunctionalComponent, Ref } from 'preact';

import Vector2 from '../engine/vector2';

import { FullscreenToggle } from './fullscreen';
import { MusicToggle } from './music';

export const GameCanvas = ({canvasRef}: {canvasRef: Ref<HTMLCanvasElement>}) => (
  <canvas id="canvas" width="480" height="320" ref={canvasRef}></canvas>
);

export class GameLayout extends Component<{children: ComponentChildren}, {scale: number}> {
  state = {scale: 1}
  node: HTMLElement|null = null
  resize = () => {
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
    scale /= pixel;
    if (scale !== this.state.scale) {
      this.setState({scale});
    }
  }
  componentDidMount() {
    window.addEventListener('resize', this.resize);
    window.addEventListener('load', this.resize);
    this.resize();
  }
  componentDidUpdate() {
    this.resize();
  }
  componentWillUnmount() {
    window.removeEventListener('load', this.resize);
    window.removeEventListener('resize', this.resize);
  }
  render() {
    const {scale} = this.state;
    return (
      <div id="game-page" class="page">
        <div class="centered">
          <div class="area" style={{transform: `scale(${scale})`}} ref={node => this.node = node}>
            {this.props.children}
          </div>
        </div>
      </div>
    );
  }
}

interface GamePauserProps {
  children: (args: {paused: boolean, pause: () => void, resume: () => void}) => ComponentChild;
}

export class GamePauser extends Component<GamePauserProps, {paused: boolean}> {
  state = {paused: false}
  pause = () => this.setState({paused: true})
  resume = () => this.setState({paused: false})
  onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') this.pause();
  }
  onTouch = (event: TouchEvent) => {
    if (event.target === document.body) this.pause();
  }
  componentDidMount() {
    window.addEventListener('keydown', this.onKey);
    document.body.addEventListener('touchstart', this.onTouch);
  }
  componentWillUnmount() {
    window.removeEventListener('keydown', this.onKey);
    document.body.removeEventListener('touchstart', this.onTouch);
  }
  render() {
    return this.props.children({
      paused: this.state.paused,
      pause: this.pause,
      resume: this.resume,
    });
  }
}

export const GamePausedOverlay = ({resume}: {resume: () => void}) => (
  <div id="game-pause" class="centered overlay">
    <p><span class="inverse">PAUSED</span></p>
    <p><span class="inverse"><a onClick={resume}>RESUME</a> or <a href="#title">TITLE</a></span></p>
    <p class="small"><span class="inverse">
      <MusicToggle/>
      {' - '}
      <FullscreenToggle/>
    </span></p>
  </div>
);

export const GameOverOverlay = () => (
  <div id="game-over" class="centered overlay">
    <p><span class="inverse">GAME OVER</span></p>
    <p><span class="inverse"><a href="#game">RETRY</a> or <a href="#title">TITLE</a></span></p>
  </div>
);

export const GameLoadingOverlay = () => (
  <div class="centered overlay">
    <p><span class="inverse">LOADING</span></p>
  </div>
);