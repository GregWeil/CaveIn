/// save.ts
//Saving and loading the current and best game

import * as Replay from '../game/replay';

function writeToStorage(name: string, replay: object|null) {
  if (replay) {
    localStorage.setItem(name, JSON.stringify(replay));
  } else {
    localStorage.removeItem(name);
  }
}

async function readFromStorage(name: string): Promise<object|null> {
  const serialized = localStorage.getItem(name);
  if (!serialized) {
    return null;
  }
  const replay = JSON.parse(serialized);
  const valid = await Replay.validate(replay);
  return valid ? replay : null;
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
    // The first time we save a replay we will resolve fromSession
    // That will notify anyone still waiting for the stored replay
    if (this.firstSet) {
      this.firstSet(value);
      this.firstSet = null;
    }
    this.fromSession = Promise.resolve(value);
    // Don't actually write deletions, so you can undo by refreshing
    if (value) {
      writeToStorage(this.name, value);
    }
  }
  
  public get(): Promise<object|null> {
    // This will wait until the save validates or a new save gets created
    // Once you create a new save fromSession resolves and it always wins
    return Promise.race([this.fromSession, this.fromStorage]);
  }
}

const save = new StoredReplay('save');
const best = new StoredReplay('best');

export async function getSave(): Promise<object|null> {
  const replay = await save.get();
  return replay && Replay.getAlive(replay) ? replay : null;
}

export async function getBest(): Promise<object|null> {
  return await best.get();
}

export async function getBestScore(): Promise<number|null> {
  const replay = await getBest();
  return replay ? Replay.getScore(replay) : null;
}

export function clearSave(): void {
  save.set(null);
}

export async function saveReplay(replay: object) {
  if (Replay.getScore(replay) <= 0) return;

  save.set(Replay.getAlive(replay) ? replay : null);

  const bestReplay = await getBest();
  const isBetterScore = !bestReplay || Replay.getScore(replay) > Replay.getScore(bestReplay);
  const isContinuation = Replay.isContinuation(replay, bestReplay);
  if (!bestReplay || isBetterScore || isContinuation) {
    best.set(replay);
  }
}