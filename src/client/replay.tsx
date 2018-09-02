/// replay.tsx
// watch replays on the replay page

import { h, Component, FunctionalComponent } from 'preact';

import Game from '../game/game';
import Replay from '../game/replay';

import { ReplayValidatorConsumer } from './validator';
import { RouterConsumer } from './router';
import { SaveConsumer } from './save';

import { GameLayout, GameCanvas } from './layout';

interface Props {
  replay: Replay|null;
  best: Replay|null;
  validator: (replay: Replay) => boolean|null;
  navigate: (page: string) => void;
  redirect: (page: string) => void;
}

class ReplayPageImpl extends Component<Props, {loading: boolean}> {
  state = {loading: true}
  canvas: HTMLCanvasElement|null = null
  game: Game|null = null
  async check() {
    const {replay, best} = this.props;
    if (!replay) {
      this.props.redirect('#title');
      return;
    } else if (!this.props.validator(replay)) {
      return;
    }
    this.setState({loading: false});
    this.game = new Game({
      canvas: this.canvas,
      seed: replay.seed,
      best: best ? best.score : null,
    });
    try {
      await replay.execute(this.game, 5);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    this.props.navigate('#title');
  }
  componentDidMount() {
    if (this.state.loading) this.check();
  }
  componentDidUpdate() {
    if (this.state.loading) this.check();
  }
  componentWillUnmount() {
    if (this.game) this.game.destructor();
  }
  render() {
    return (
      <GameLayout>
        <GameCanvas canvasRef={canvas => this.canvas = canvas}/>
      </GameLayout>
    );
  }
}

const ReplayPage: FunctionalComponent = () => (
  <RouterConsumer>
    {routing => (
      <ReplayValidatorConsumer>
        {validator => (
          <SaveConsumer>
            {({best}) => (
              <ReplayPageImpl replay={best} best={best} validator={validator} {...routing}/>
            )}
          </SaveConsumer>
        )}
      </ReplayValidatorConsumer>
    )}
  </RouterConsumer>
);

export default ReplayPage;