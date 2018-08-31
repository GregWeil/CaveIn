/// actions.ts
// Exports some interfaces that get used a bunch

import { ActionsType, ActionResult } from 'hyperapp';
import Replay from '../game/replay';

export interface State {
  page: string;
  fullscreen: boolean;
  validated: WeakMap<Replay, boolean>;
  save: Replay|null;
  best: Replay|null;
};

export interface Actions {
  setPage: (page: string) => ActionResult<State>;
  setFullscreen: (fullscren: boolean) => ActionResult<State>;
  clearSave: (save: Replay|null) => ActionResult<State>;
  load: () => ActionResult<State>;
  save: (save: Replay|null) => ActionResult<State>;
};

function writeReplay(name: string, replay: Replay|null) {
  if (replay) {
    localStorage.setItem(name, replay.serialize());
  } else {
    localStorage.removeItem(name);
  }
}

async function readReplay(name: string) {
  const serialized = localStorage.getItem(name);
  if (!serialized) {
    return null;
  }
  const replay = Replay.deserialize(serialized);
  const valid = replay && await replay.validate();
  return valid ? replay : null;
}

export const actions: ActionsType<State, Actions> = {
  setPage: (page) => ({page}),
  setFullscreen: (fullscreen) => ({fullscreen}),
  clearSave: () => ({save: null}),
  load: () => (state, actions) => {
    const save = readReplay('best');
    const best = readReplay('best'
  },
  save: (replay) => (state, actions) => {
    
  },
};