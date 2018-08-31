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
  loadSave: (save: Replay|null) => ActionResult<State>;
  loadBest: (save: Replay|null) => ActionResult<State>;
  clearSave: (save: Replay|null) => ActionResult<State>;
  saveReplay: (save: Replay|null) => ActionResult<State>;
};

export const actions: ActionsType<State, Actions> = {
  setPage: (page) => ({page}),
  setFullscreen: (fullscreen) => ({fullscreen}),
  loadSave: (save) => (state) => (state.save === undefined ? {save} : null),
  loadBest: (best) => (state) => (state.best === undefined ? {best} : null),
  clearSave: () => ({save: null}),
  saveReplay: (replay) => null,
};