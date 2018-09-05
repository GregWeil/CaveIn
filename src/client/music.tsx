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

const { Provider, Consumer } = createContext<MusicContext>({playing: false, loading: false, play: () => {}, pause: () => {}});

export class MusicManager extends Component<MusicProps, MusicState> {
  state = {playing: false, loading: false}
  play = () => {
    this.setState({loading: true});
    setTimeout(() => this.setState({playing: true, loading: false}), 1000);
  }
  pause = () => {
    this.setState({playing: false});
  }
  render() {
    return (
      <Provider value={{
        ...this.state,
        play: this.play,
        pause: this.pause,
      }}>
        {this.props.children}
      </Provider>
    );
  }
}

export const MusicToggle = () => (
  <Consumer render={({playing, loading, play, pause}) => (
    playing ? (
      <a onClick={pause}>stop music</a>
    ) : (
      loading ? (
        'loading music'
      ) : (
        <a onClick={play}>play music</a>
      )
    )
  )}/>
);