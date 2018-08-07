/// replays.ts
//Replay validation and recording

import Game from './game';

class ReplayExecutor {
  private replay: Replay;
  private game: Game;
  private step: number;
  
  constructor(replay: Replay, game: Game) {
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
    
    let lastStepTime = performance.now();
    let stepsSinceBreak = 0;
    while (this.step < goal) {
      const nextTime = lastStepTime + 1000/rate;
      while (nextTime > performance.now() || stepsSinceBreak >= 50) {
        await new Promise(resolve => setTimeout(resolve));
        stepsSinceBreak = 0;
      }
      
      if (!this.game.active) {
        throw 'game destroyed while replay in progress';
      }
      
      const command = this.replay.commands[this.step];
      if (!this.game.commandCheck(command)) {
        throw 'unable to execute replay, command was invalid';
      }
      this.game.update(command);
      
      this.step += 1;
      lastStepTime = nextTime;
      stepsSinceBreak += 1;
    }
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
  
  getExecutor(game: Game) {
    return new ReplayExecutor(this, game);
  }
  
  async execute(game: Game, rate?: number) {
    const executor = this.getExecutor(game);
    await executor.execute(rate || Infinity);
  }
  
  async validate() {
    const game = new Game({
      seed: this.seed
    });

    let alive = true;
    game.on('player-died', evt => {
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
  
  record(game: Game, callback: (replay: Replay, game: Game) => void) {
    callback(this, game);

    game.onUpdate.listen(evt => {
      this.commands.push(evt.data.command);
    }, -Infinity);

    game.onScore.listen(evt => {
      this.score = game.score;
    }, Infinity);

    game.on('player-died', evt => {
      this.alive = false;
    }, undefined, Infinity);

    game.onUpdate.listen(evt => {
      callback(this, game);
    }, Infinity);
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