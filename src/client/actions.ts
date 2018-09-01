/// actions.ts
// Exports some interfaces that get used a bunch

import { ActionsType, ActionResult } from 'hyperapp';

import { WrappedGame, createPlayable } from './game';
import Replay from '../game/replay';

export interface State {
  page: string;
  fullscreen: boolean;
  validated: WeakMap<Replay, boolean>;
  save: Replay|null;
  best: Replay|null;
  game: WrappedGame|null;
};

export interface Actions {
  getState(): ActionResult<State>;
  setPage(page: string): ActionResult<State>;
  setFullscreen(fullscren: boolean): ActionResult<State>;
  
  setValid(args: [Replay, boolean]): ActionResult<State>;
  clearSave(save: Replay|null): ActionResult<State>;
  load(): ActionResult<State>;
  save(save: Replay|null): ActionResult<State>;
  
  clearGame(): ActionResult<State>;
  createGame(save: Replay): ActionResult<State>;
  createWatch(replay: Replay): ActionResult<State>;
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
  getState: () => (state) => state,
  setPage: (page) => (state, actions) => {
    actions.clearGame();
    return {page};
  },
  setFullscreen: (fullscreen) => ({fullscreen}),
  
  setValid: ([replay, valid]) => (state: State) => {
    const validated = state.validated;
    validated.set(replay, valid);
    return {validated};
  },
  clearSave: () => ({save: null}),
  load: () => (state, actions) => {
    const save = readReplay('save');
    if (save) {
      save.validate().then(valid => actions.setValid([save, valid]));
    }
    const best = readReplay('best');
    if (best) {
      best.validate().then(valid => actions.setValid([best, valid]));
    }
    return {save, best};
  },
  save: (replay) => (state, actions) => {
    actions.setValid([replay, true]);
    
    if (replay.score <= 0) {
      return;
    }
    
    const save = replay.alive ? replay : null;
    writeReplay('save', save);
    
    if (!state.best || replay.score > state.best.score || replay.isContinuationOf(state.best)) {
      writeReplay('best', replay);
      return {save, best: replay};
    }
    return {save};
  },
  
  clearGame: () => (state) => {
    state.game && state.game.destructor();
    return {game: null};
  },
  createGame: (save) => (state) => {
    if (state.game) return;
    const canvas = document.getElementById('canvas') as HTMLCanvasElement;
    return {game: createPlayable(canvas, save, state.best ? state.best.score : undefined)};
  },
  createWatch: (replay) => (state) => {
    if (state.game) return;
    
  },
};