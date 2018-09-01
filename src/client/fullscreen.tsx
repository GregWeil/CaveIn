/// fullscreen.tsx
// Fullscreen manager and toggle

import { h, Component, createContext } from 'preact';
import fscreen from 'fscreen';

const { Provider, Consumer } = createContext();

async function enter() {
  await fscreen.requestFullscreen(document.documentElement);
  (window as any).screen.orientation.lock('landscape');
};

async function exit() {
  fscreen.exitFullscreen();
};

export class FullscreenManager extends Component<{}, {fullscreen: boolean}> {
  state = {fullscreen: false}
  onFullscreenChange() {
    this.setState({fullscreen: !!fscreen.fullscreenElement});
  }
  componentDidMount() {
    this.onFullscreenChange = this.onFullscreenChange.bind(this);
    fscreen.addEventListener('fullscreenchange', this.onFullscreenChange);
    this.onFullscreenChange();
  }
  componentWillUnmount() {
    fscreen.removeEventListener('fullscreenchange', this.onFullscreenChange);
  }
  render({children}, {fullscreen}) {
    return <Provider value={{fullscreen, enter, exit}}>{children}</Provider>;
  }
}

export const FullscreenToggle = () => (
  <Consumer>
    {({fullscreen, enter, exit}) => (
      props.fullscreen ? (
        <a onclick={exit}>exit fullscreen</a>
      ) : (
        <a onclick={enter}>fullscreen</a>
      )
    )}
  </Consumer>
);