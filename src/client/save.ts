/// save.ts
//Saving and loading the current and best game

import * as Replay from '../game/replay';

let best: any | null | undefined = undefined;
export async function getBest() {
  if (best !== undefined) {
    return best;
  }
  
}