/// actions.ts
// Exports some interfaces that get used a bunch

import { ActionsType, ActionResult } from 'hyperapp';

export interface State {
  page: string;
  fullscreen: boolean;
};

export interface Actions {
  setPage: (page: string) => ActionResult<State>;
  setFullscreen: (fullscren: boolean) => ActionResult<State>;
};

export const actions: ActionsType<State, Actions> = {
  setPage: (page) => ({page}),
  setFullscreen: (fullscreen) => ({fullscreen}),
};