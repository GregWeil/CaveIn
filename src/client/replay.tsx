/// replay.tsx
// watch replays on the replay page

import { h, Component, FunctionalComponent } from 'preact';

import Game from '../game/game';
import Replay from '../game/replay';

import { ReplayValidatorConsumer } from './validator';
import { SaveConsumer } from './save';

import { GameLayout, GameCanvas } from './game';

interface Props {
  replay: Replay|null;
  best: Replay|null;
  validator: (replay: Replay) => boolean|null;
}

class ReplayPageImpl extends Component<Props, {loading: boolean}> {
  state = {loading: true}
  canvas: HTMLCanvasElement|null = null
  game: Game|null = null
  async check() {
    const {replay, best} = this.props;
    if (!replay) {
      window.location.replace('#title');
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
      await new Promise(resolve => setTimeout(resolve, 3000));
    } finally {
      window.location.assign('#title');
    }
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
  <ReplayValidatorConsumer>
    {validator => (
      <SaveConsumer>
        {({best}) => (
          <ReplayPageImpl replay={best} best={best} validator={validator}/>
        )}
      </SaveConsumer>
    )}
  </ReplayValidatorConsumer>
);

export default ReplayPage;