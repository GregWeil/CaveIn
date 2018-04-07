/// replays.js
//Replay validation and recording

import * as Game from './game';

export default class Replay {
  seed: number;
  commands: string[];
  alive: boolean;
  score: number;
  
  constructor(seed: number) {
    this.seed = seed;
    this.commands = [];
    this.alive = true;
    this.score = -1;
  }
  
  async execute(game: any): Promise<void>;
  async execute(game: any, rate: number): Promise<void>;
  async execute(game: any, rate: (i: number) => number): Promise<void>;
  async execute(game: any, rate?: number|((i: number) => number)): Promise<void> {
    let getRate = (i: number) => Infinity;
    if (typeof(rate) === 'number') {
      getRate = (i => rate);
  }
    return execute(game, this.commands, getRate(0));
  }
  
  async validate() {
    const game: any = new Game({
      seed: this.seed
    });

    let alive = true;
    game.on('player-died', (evt: any) => {
      alive = false;
    });

    const invalid = [];

    try {
      await execute(game, this.commands, Infinity, 500);
    } catch (e) {
      invalid.push('invalid inputs');
    }
    if (alive && !this.alive) {
      invalid.push('player should have died');
    }
    if (!alive && this.alive) {
      invalid.push('player should have lived');
    }
    if (game.score !== this.score) {
      invalid.push('score mismatch');
    }
    game.destructor();

    invalid.forEach(reason => console.log(reason));

    return !invalid.length;
  }
  
  isContinuationOf(other: Replay) {
    if (this.seed !== other.seed) return false;
    if (this.commands.length < other.commands.length) return false;
    for (let i = 0; i < other.commands.length; ++i) {
      if (this.commands[i] !== other.commands[i]) {
        return false;
      }
    }
    return true;
  }
  
  record(game: any, callback: (replay: Replay, game: any) => void) {
    callback(this, game);

    game.on('update', (evt: any) => {
      this.commands.push(evt.data.command);
    }, undefined, -Infinity);

    game.on('score', (evt: any) => {
      this.score = game.score;
    }, undefined, Infinity);

    game.on('player-died', (evt: any) => {
      this.alive = false;
    }, undefined, Infinity);

    game.on('update', (evt: any) => {
      callback(this, game);
    }, undefined, Infinity);
  }
  
  serialize(): string {
    return JSON.stringify({
      seed: this.seed,
      commands: this.commands,
      validate: {
        alive: this.alive,
        score: this.score,
        version: 1,
      },
    });
  }
  
  static deserialize(json: string): Replay|null {
    const data = JSON.parse(json);
    if (!data) {
      return null;
    } else if (data.validate && data.validate.version == 1) {
      const replay = new Replay(data.seed);
      replay.commands = data.commands;
      replay.alive = data.validate.alive;
      replay.score = data.validate.score;
      return replay;
    }
    return null;
  }
}

(window as any).replay = Replay;

export function execute(game: any, commands: string[], rate: number, limit: number) {
  return new Promise((resolve, reject) => {
    var start = performance.now() - 1;

    rate = rate || Infinity;
    limit = limit || Infinity;

    function step(index: number) {
      var target = Math.round((performance.now() - start) * (rate / 1000));
      target = Math.min(target, (index + limit), commands.length);

      for (var i = index; i < target; ++i) {
        if (!game.commandCheck(commands[i])) {
          reject();
          return;
        }
        game.update(commands[i]);
      }

      if (target < commands.length) {
        setTimeout(step, 0, target);
      } else {
        resolve();
      }
    }

    setTimeout(step, 0, 0);
  });
}

export async function validate(replay: any) {
  if (!replay) return false;
  if (!replay.validate) return false;
  
  var game: any = new Game({
    seed: replay.seed
  });
  
  var alive = true;
  game.on('player-died', (evt: any) => {
    alive = false;
  });
  
  var invalid = [];
  
  try {
    await execute(game, replay.commands, Infinity, 500);
  } catch (e) {
    invalid.push('invalid inputs');
  }
  if (alive && !replay.validate.alive) {
    invalid.push('player should have died');
  }
  if (!alive && replay.validate.alive) {
    invalid.push('player should have lived');
  }
  if (game.score !== replay.validate.score) {
    invalid.push('score mismatch');
  }
  game.destructor();
  
  if (invalid.length) {
    console.log(invalid.join('\n'));
  }
  
  return !invalid.length;
}

export function record(game: any, callback: (replay: any, game: any) => void, replay: any) {
  replay = replay || {
    seed: game.randomSeed,
    commands: [],
    validate: {
      alive: true,
      score: 0,
      version: 1
    }
  };

  callback(replay, game);

  game.on('update', (evt: any) => {
    replay.commands.push(evt.data.command);
  }, undefined, -Infinity);

  game.on('score', (evt: any) => {
    replay.validate.score = game.score;
  }, undefined, Infinity);

  game.on('player-died', (evt: any) => {
    replay.validate.alive = false;
  }, undefined, Infinity);

  game.on('update', (evt: any) => {
    callback(replay, game);
  }, undefined, Infinity);
}

export function getScore(replay: any) {
  return replay.validate.score;
}

export function getAlive(replay: any) {
  return replay.validate.alive;
}

export function isContinuation(long: any, short: any): boolean {
  if (!long || !short) return false;
  if (long.seed !== short.seed) return false;
  if (getScore(long) < getScore(short)) return false;
  if (long.commands.length < short.commands.length) return false;
  return true;
}