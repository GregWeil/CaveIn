/// save.ts
//Saving and loading the current and best game

import * as Replay from '../game/replay';

async function getBestFromStorage(): Promise<object|null> {
  const serialized = localStorage.getItem('best');
  if (!serialized) {
    return null;
  }
  const replay = JSON.parse(serialized);
  const valid = await Replay.validate(replay);
  return valid ? replay : null;
}
const bestFromStorage = getBestFromStorage();
let bestNewlyWritten = new Promise<object|null>((resolve, reject) => {});

export async function getBest(): Promise<object|null> {
  return PRom