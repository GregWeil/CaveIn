/// actions.ts
// Exports some interfaces that get used a bunch

import { ActionsType, ActionResult } from 'hyperapp';
import Replay from '../game/replay';

export interface State {
  page: string;
  fullscreen: boolean;
  save: Replay|null|undefined;
  best: Replay|null|undefined;
};

export interface Actions {
  setPage: (page: string) => ActionResult<State>;
  setFullscreen: (fullscren: boolean) => ActionResult<State>;
  clearSave: (save: Replay|null) => ActionResult<State>;
  handleValidation: (replay: Replay|null) => ActionResult<State>;
  load: () => ActionResult<State>;
  save: (save: Replay|null) => ActionResult<State>;
};

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

export const actions: ActionsType<State, Actions> = {
  setPage: (page) => ({page}),
  setFullscreen: (fullscreen) => ({fullscreen}),
  clearSave: () => ({save: null}),
  load: () => (state, actions) => {
    
  },
  save: (replay) => (state, actions) => {
    
  },
};