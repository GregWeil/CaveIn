/// save.ts
//Saving and loading the current and best game

import * as Replay from '../game/replay';

async function readFromStorage(name: string): Promise<object|null> {
  const serialized = localStorage.getItem(name);
  if (!serialized) {
    return null;
  }
  const replay = JSON.parse(serialized);
  const valid = await Replay.validate(replay);
  return valid ? replay : null;
}

function writeToStorage(name: string, replay: object|null) {
  if (replay) {
    localStorage.setItem(name, JSON.stringify(replay));
  } else {
    localStorage.removeItem(name);
  }
}

class StoredReplay {
  private name: string;
  private fromStorage: Promise<object|null>;
  private fromSession: Promise<object|null>;
  private firstSet: ((value: object|null) => void)|null;
  
  public constructor(name: string) {
    this.name = name;
    this.firstSet = null;
    this.fromStorage = readFromStorage(this.name);
    this.fromSession = new Promise<object|null>(resolve => {
      this.firstSet = resolve;
    });
  }
  
  public set(value: object|null): void {
    if (this.firstSet) {
      this.firstSet(value);
      this.firstSet = null;
    }
    this.fromSession = Promise.resolve(value);
    writeToStorage(this.name, value);
  }
  
  public get(): Promise<object|null> {
    return Promise.race([this.fromSession, this.fromStorage]);
  }
}

const save = new StoredReplay('save');
const best = new StoredReplay('best');