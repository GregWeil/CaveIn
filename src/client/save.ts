/// save.ts
//Saving and loading the current and best game

import * as Replay from '../game/replay';

async function getFromStorage(name: string): Promise<object|null> {
  const serialized = localStorage.getItem(name);
  if (!serialized) {
    return null;
  }
  const replay = JSON.parse(serialized);
  const valid = await Replay.validate(replay);
  return valid ? replay : null;
}

class ReplayStorage {
  name: string;
  replayFromStorage: Promise<object|null>;
  replayFromSession: Promise<object|null>;
  
  constructor(name: string) {
    this.name = name;
    this.replayFromStorage = getFromStorage(this.name);
    this.replayFromSession = new Promise(resolve => {
      
    });
  }
}

const bestFromStorage = getFromStorage('best');
let bestFromSession = new Promise<object|null>((resolve, reject) => {});

export async function getBest(): Promise<object|null> {
  return Promise.race([bestFromSession, bestFromStorage]);
}

function setBest(replay: object|null): void {
  bestFromSession = Promise.resolve(replay);
  localStorage.setItem('best', JSON.stringify(replay));
}