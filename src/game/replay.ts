/// replays.js
//Replay validation and recording

import * as Game from './game';

class ReplayExecutor {
  replay: Replay;
  game: any;
  step: number;
  
  constructor(replay: Replay, game: any) {
    this.replay = replay;
    this.game = game;
    this.step = 0;
  }
  
  async execute(rate: number, goal?: number) {
    if (goal === undefined) {
      goal = Infinity;
    } else if (goal < -this.replay.commands.length) {
      return;
    }
    
    if (goal > this.replay.commands.length) {
      goal = this.replay.commands.length;
    } else if (goal < 0) {
      goal += this.replay.commands.length;
    }
    
    // The following bit should really get rewritten
    await new Promise((resolve, reject) => {
      const start = performance.now() - 1;

      const step = (index: number) => {
        if (!this.game.active) {
          console.warn('game destroyed while replay in progress');
          resolve();
          return;
        }
        
        let target = Math.round((performance.now() - start) * (rate / 1000));
        target = Math.min(target, (index + 100), goal!);

        for (let i = index; i < target; ++i) {
          if (!this.game.commandCheck(this.replay.commands[i])) {
            reject();
            return;
          }
          this.game.update(this.replay.commands[i]);
        }

        if (target < goal!) {
          setTimeout(step, 0, target);
        } else {
          resolve();
        }
      }

      setTimeout(step, 0, this.step);
    });
    
    this.step = goal;
  }
}

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
  
  getExecutor(game: any) {
    return new ReplayExecutor(this, game);
  }
  
  async execute(game: any, rate?: number) {
    const executor = this.getExecutor(game);
    await executor.execute(rate || Infinity);
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
      await this.execute(game);
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