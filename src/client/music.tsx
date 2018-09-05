/// music.tsx
// Manage music playing

import { h, Component, ComponentChildren } from 'preact';
import { createContext } from 'preact-context';

interface MusicProps {
  children: ComponentChildren;
}

interface MusicState {
  playing: boolean;
  loading: boolean;
}

interface MusicContext extends MusicState {
  play(): void;
  pause(): void;
}

const { Provider, Consumer } = createContext<MusicState>({playing: false, loading: false, play: () => {}, pause: () => {}});

export class MusicManager extends Component<MsuicProps, MusicState> {
  state = {playing: false, loading: false}
  play = () => {
  }
  pause = () => {
  }
  render() {
    return (
      this.props.children[0]({
        ...this.state,
        play: this.play,
        pause: this.pause,
      })
    );
  }
}

