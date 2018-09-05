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

const { Provider, Consumer } = createContext<SaveState>({save: null, best: null});

const readReplay = (name: string) => {
  const serialized = localStorage.getItem(name);
  if (!serialized) {
    return null;
  }
  return Replay.deserialize(serialized);
};

const writeReplay = (name: string, replay: Replay) => {
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
  save(replay: Replay) {
    if (replay.score <= 0) return;

    save.set(replay.alive ? replay : null);

    if (!this.state.best
        || replay.score > this.state.best.score
        || replay.isContinuationOf(this.state.best))
    {
      best.set(replay);
    }
  }
  render({children}: SaveProps, {save, best}: SaveState) {
    return <Provider value={{save, best}}>{children}</Provider>;
  }
};

export const SaveConsumer = ({children}: {children(state: SaveState): ComponentChildren}) => (
  <Consumer>{children}</Consumer>
);

function writeToStorage(name: string, replay: Replay|null) {
  if (replay) {
    localStorage.setItem(name, replay.serialize());
  } else {
    localStorage.removeItem(name);
  }
}

async function readFromStorage(name: string) {
  const serialized = localStorage.getItem(name);
  if (!serialized) {
    return null;
  }
  const replay = Replay.deserialize(serialized);
  const valid = replay && await replay.validate();
  return valid ? replay : null;
}

class StoredReplay {
  private name: string;
  private fromStorage: Promise<Replay|null>;
  private fromSession: Promise<Replay|null>;
  private firstSet: ((value: Replay|null) => void)|null;
  
  public constructor(name: string) {
    this.name = name;
    this.firstSet = null;
    this.fromStorage = readFromStorage(this.name);
    this.fromSession = new Promise<Replay|null>(resolve => {
      this.firstSet = resolve;
    });
  }
  
  public set(value: Replay|null) {
    // The first time we save a replay we will resolve fromSession
    // That will notify anyone still waiting for the stored replay
    if (this.firstSet) {
      this.firstSet(value);
      this.firstSet = null;
    }
    this.fromSession = Promise.resolve(value);
    // Don't actually write deletions, so you can undo by refresh
    if (value) {
      writeToStorage(this.name, value);
    }
  }
  
  public get() {
    // This will wait until the save validates or a new save gets created
    // Once you create a new save fromSession resolves and it always wins
    return Promise.race([this.fromSession, this.fromStorage]);
  }
}

const save = new StoredReplay('save');
const best = new StoredReplay('best');

export async function getSave() {
  const replay = await save.get();
  return replay && replay.alive ? replay : null;
}

export async function getBest() {
  return await best.get();
}

export async function getBestScore() {
  const replay = await getBest();
  return replay ? replay.score : null;
}

export function clearSave() {
  save.set(null);
}

export async function saveReplay(replay: Replay) {
  if (replay.score <= 0) return;

  save.set(replay.alive ? replay : null);

  const bestReplay = await getBest();
  if (!bestReplay
      || replay.score > bestReplay.score
      || replay.isContinuationOf(bestReplay))
  {
    best.set(replay);
  }
}