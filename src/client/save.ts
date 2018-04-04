/// save.ts
//Saving and loading the current and best game

import * as Replay from '../game/replay';

let bestModified: boolean = false;
let bestPromise: Promise<object|null>;
async function getBest(): Promise<object|null> {
  const serialized = localStorage.getItem('best');
  if (!serialized) {
    return null;
  }
  const replay = JSON.parse(serialized);
  const valid = await Replay.validate(replay);
  
}