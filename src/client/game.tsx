/// game.tsx
// The page where you play the game

import { h, Component, FunctionalComponent } from 'preact';

import * as Input from '../engine/input';
import Game from '../game/game';
import Replay from '../game/replay';

import { ReplayValidatorConsumer } from './validator';
import { RouterConsumer } from './router';
import { SaveConsumer } from './save';

import { GameLayout, GameCanvas, GameLoadingOverlay, GameOverOverlay } from './layout';

interface Props {
  save: Replay|null;
  best: Replay|null;
  validator(replay: Replay): boolean|null;
  store(replay: Replay): void;
  redirect(page: string): void;
}

interface State {
  loading: boolean;
  gameover: boolean;
}

class GamePageImpl extends Component<Props, State> {
  state = {loading: true, gameover: false}
  canvas: HTMLCanvasElement|null = null
  game: Game|null = null
  input: Input.Input|null = null
  async check() {
    let {save, best, store} = this.props;
    if (save && this.props.validator(save) === null) {
      return;
    }
    this.setState({loading: false});
    
    const game = this.game = new Game({
      canvas: this.canvas,
      seed: save ? save.seed : null,
      best: best ? best.score : null,
    });

    game.onPlayerDied.listen(() => {
      setTimeout(() => this.setState({gameover: true}), 1000);
    });

    if (save) {
      try {
        const executor = save.getExecutor(game);
        game.silent = true;
        await executor.execute(2500, -100);
        await executor.execute(500, -5);
        game.silent = false;
        await executor.execute(5, -1);
        await executor.execute(1.5);
      } catch (e) {
        // Don't leave the player in a broken game
        this.props.redirect('#title');
        throw e;
      }
    } else {
      save = new Replay(game.randomSeed);
    }

    save.record(game, (replay, replayGame) => {
      if (replayGame == game) {
        store(replay);
      }
    });

    this.input = new Input.InputQueued([
      new Input.InputKeyboard({
        'KeyW': 'up',
        'KeyA': 'left',
        'KeyS': 'down',
        'KeyD': 'right',

        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right',

        'Space': 'action'
      }),
      new Input.InputSwipe(game.canvas, [
        'right', null, 'down', null,
        'left', null, 'up', null,
      ], 'action'),
    ]);
    this.input.listen(command => {
      if (game.commandCheck(command)) {
        game.update(command);
      }
    });
  }
  componentDidMount() {
    if (this.state.loading) this.check();
  }
  componentDidUpdate() {
    if (this.state.loading) this.check();
  }
  componentWillUnmount() {
    if (this.input) this.input.destructor();
    if (this.game) this.game.destructor();
  }
  render() {
    return (
      <GameLayout>
        <GameCanvas canvasRef={canvas => this.canvas = canvas}/>
        {this.state.loading && <GameLoadingOverlay/>}
        {this.state.gameover && <GameOverOverlay/>}
      </GameLayout>
    );
  }
}

const GamePage: FunctionalComponent = () => (
  <RouterConsumer>
    {routing => (
      <ReplayValidatorConsumer>
        {validator => (
          <SaveConsumer>
            {({save, best, store}) => (
              <GamePageImpl save={save} best={best} validator={validator} store={store} {...routing}/>
            )}
          </SaveConsumer>
        )}
      </ReplayValidatorConsumer>
    )}
  </RouterConsumer>
);

export default GamePage;