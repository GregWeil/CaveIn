/// save.ts
//Saving and loading the current and best game

import * as Replay from '../game/replay';

let best: any | null | undefined = undefined;
let b: boolean = false;
export async function getBest() {
  const serializedBest = localStorage.getItem('best');
  
  
}