/// fullscreen.tsx
// Fullscreen manager and toggle

import { h, Component, ComponentChild } from 'preact';
import { createContext } from 'preact-context';
import fscreen from 'fscreen';

interface Context {
  fullscreen: boolean;
  enter(): void;
  exit(): void;
}

const { Provider, Consumer } = createContext<Context>({fullscreen: false, enter, exit});

async function enter() {
  await fscreen.requestFullscreen(document.documentElement);
  (window as any).screen.orientation.lock('landscape');
};

async function exit() {
  fscreen.exitFullscreen();
};

export class FullscreenManager extends Component<{children: ComponentChild}, {fullscreen: boolean}> {
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
  render() {
    return <Provider value={{fullscreen: this.state.fullscreen, enter, exit}}>{this.props.children}</Provider>;
  }
}

export const FullscreenToggle = () => (
  <Consumer>
    {({fullscreen, enter, exit}: Context) => (
      fullscreen ? (
        <a onClick={exit}>exit fullscreen</a>
      ) : (
        <a onClick={enter}>fullscreen</a>
      )
    )}
  </Consumer>
);