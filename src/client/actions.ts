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
  setValid: (replay: Replay, valid: boolean) => ActionResult<State>;
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

function readReplay(name: string) {
  const serialized = localStorage.getItem(name);
  if (!serialized) {
    return null;
  }
  return Replay.deserialize(serialized);
}

export const actions: ActionsType<State, Actions> = {
  setPage: (page) => ({page}),
  setFullscreen: (fullscreen) => ({fullscreen}),
  setValid: (replay: Replay, valid: boolean) => (state: State) => {
    const validated = new WeakMap<Replay, boolean>(state.validated);
    validated.set(replay, valid);
    return {validated};
  },
  clearSave: () => ({save: null}),
  load: () => (state, actions) => {
    const save = readReplay('save');
    if (save) {
      save.validate().then(valid => actions.setValid(save, valid));
    }
    const best = readReplay('best');
    if (best) {
      best.validate().then(valid => actions.setValid(best, valid));
    }
    return {save, best};
  },
  save: (replay) => (state, actions) => {
    
  },
};