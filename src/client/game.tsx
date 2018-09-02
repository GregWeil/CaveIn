/// game.tsx
// The page where you play the game

import { h, Component, FunctionalComponent } from 'preact';

import * as Input from '../engine/input';
import Game from '../game/game';
import Replay from '../game/replay';

import { ReplayValidatorConsumer } from './validator';
import { RouterConsumer } from './router';
import { SaveConsumer } from './save';

import { GameLayout, GameCanvas, GameOverOverlay } from './layout';

interface Props {
  save: Replay|null;
  best: Replay|null;
  validator: (replay: Replay) => boolean|null;
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
        {this.state.gameover && <GameOverOverlay/>}
      </GameLayout>
    );
  }
}

const GamePage: FunctionalComponent = () => (
  <ReplayValidatorConsumer>
    {validator => (
      <SaveConsumer>
        {({save, best}) => (
          <GamePageImpl save={save} best={best} validator={validator}/>
        )}
      </SaveConsumer>
    )}
  </ReplayValidatorConsumer>
);

export default GamePage;