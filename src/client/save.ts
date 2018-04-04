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

class Storage {
  private name: string;
  private fromStorage: Promise<object|null>;
  private fromSession: Promise<object|null>;
  private firstSe
  
  public constructor(name: string) {
    this.name = name;
    this.fromStorage = getFromStorage(this.name);
    this.fromSession = new Promise<object|null>(resolve => {
      
    });
  }
  
  public get(): Promise<object|null> {
    return Promise.race([this.fromSession, this.fromStorage]);
  }
  
  public set(value: object|null): void {
    this.fromSession = Promise.resolve(value);
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