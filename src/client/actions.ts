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
  setSave: (save: Replay|null) => ActionResult<State>;
  setBest: (save: Replay|null) => ActionResult<State>;
};

export const actions: ActionsType<State, Actions> = {
  setPage: (page) => ({page}),
  setFullscreen: (fullscreen) => ({fullscreen}),
  setSave: (save) => ({save}),
  setBest: (best) => ({best}),
};