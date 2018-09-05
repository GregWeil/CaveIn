/// save.tsx
//Saving and loading the current and best game

import { h, Component, ComponentChildren } from 'preact';
import { createContext } from 'preact-context';

import Replay from '../game/replay';

interface SaveProps {
  children: ComponentChildren;
}

interface SaveState {
  save: Replay|null;
  best: Replay|null;
}

interface SaveContext extends SaveState {
  store(replay: Replay): void;
}

const { Provider, Consumer } = createContext<SaveContext>({save: null, best: null, store: () => {}});

const readReplay = (name: string) => {
  const serialized = localStorage.getItem(name);
  if (!serialized) {
    return null;
  }
  return Replay.deserialize(serialized);
};

const writeReplay = (name: string, replay: Replay|null) => {
  if (replay) {
    localStorage.setItem(name, replay.serialize());
  } else {
    localStorage.removeItem(name);
  }
};

export class SaveManager extends Component<SaveProps, SaveState> {
  state = this.getSave()
  getSave() {
    return {
      save: readReplay('save'),
      best: readReplay('best'),
    };
  }
  load = () => this.setState(this.getSave())
  componentDidMount() {
    window.addEventListener('storage', this.load);
    this.load();
  }
  componentWillUnmount() {
    window.removeEventListener('storage', this.load);
  }
  save = (replay: Replay) => {
    if (replay.score <= 0) return;

    const save = replay.alive ? replay : null;
    writeReplay('save', save);
    this.setState({save});
    
    if (!this.state.best
        || replay.score > this.state.best.score
        || replay.isContinuationOf(this.state.best))
    {
      writeReplay('best', replay);
      this.setState({best: replay});
    }
  }
  render({children}: SaveProps, {save, best}: SaveState) {
    return <Provider value={{save, best, store: this.save}}>{children}</Provider>;
  }
};

export const SaveConsumer = ({children}: {children(state: SaveContext): ComponentChildren}) => (
  <Consumer>{children}</Consumer>
);