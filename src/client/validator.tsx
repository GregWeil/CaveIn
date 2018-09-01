/// validator.tsx
// Tracks replay validation

import { h, Component, VNode } from 'preact';
import { createContext } from 'preact-context';

import Replay from '../game/replay';

interface Props {
  children: VNode;
}

interface State {
  validated: WeakMap<Replay, boolean>;
}

interface Context {
  (replay: Replay): boolean|null;
}

const { Provider, Consumer } = createContext<Context>(() => null);

export class ReplayValidatorManager extends Component<Props, State> {
  state = {validated: new WeakMap()}
  pending = new Set<Replay>()
  validate(replay: Replay) {
    if (this.state.validated.has(replay)) {
      return this.state.validated.get(replay);
    } else if (!this.pending.has(replay)) {
      this.pending.add(replay);
      replay.validate().then(valid => {
        this.setState((state: State) => {
          this.pending.delete(replay);
          const validated = state.validated;
          validated.set(replay, valid);
          return {validated};
        });
      });
    }
    return null;
  }
  render({children}: Props, {validated}: State) {
    return <Provider value={this.validate.bind(this)}>children</Provider>;
  }
}

export const ReplayValidatorConsumer = ({children}: {children: (func: Context) => VNode}) => (
  <Consumer render={children}/>
);