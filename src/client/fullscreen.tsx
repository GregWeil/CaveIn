/// fullscreen.tsx
// Fullscreen manager and toggle

import { h, Component, createContext } from 'preact';
import fscreen from 'fscreen';

const { Provider, Consumer } = createContext();

export class FullscreenManager extends Component {
  state: {fullscreen: false}
  componentDidMount() {
  }
  componentWillUnmount() {
  }
  render({children}, {fullscreen}) {
    
  }
}

async function fullscreenEnter() {
  await fscreen.requestFullscreen(document.documentElement);
  (window as any).screen.orientation.lock('landscape');
};

async function fullscreenExit() {
  fscreen.exitFullscreen();
};

export const FullscreenToggle = (props: {fullscreen: boolean}) => (
  props.fullscreen ? (
    <a onclick={fullscreenExit}>exit fullscreen</a>
  ) : (
    <a onclick={fullscreenEnter}>fullscreen</a>
  )
);