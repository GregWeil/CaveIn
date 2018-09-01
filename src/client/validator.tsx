/// validator.tsx
// Tracks replay validation

import { h, Component, VNode } from 'preact';
import { createContext } from 'preact-context';

import Replay from '../game/replay';

interface Props {
  children: VNode;
}

interface State {
  validated: WeakMap<Replay, boolean|null>;
}

interface Context {
  (replay: Replay): boolean|null;
}

const { Provider, Consumer } = createContext<Context>(() => null);

export class ReplayValidator extends Component<Props, State> {
  state = {validated: new WeakMap()}
  validate(replay: Replay) {
    if (this.state.validated.has(replay)) {
      return this.state.validated.get(replay);
    }
    this.setState((state: State) => {
      const validated = state.validated;
      validated.set(replay, null);
      return {validated};
    })
    replay.validate().then(valid => {
      this.setState((state: State) => {
        const validated = state.validated;
        validated.set(replay, valid);
        return {validated};
      });
    });
    return null;
  }
  render({children}: Props, {validated}: State) {
    return <Provider value={this.validate.bind(this)}>children</Provider>;
  }
}

export class