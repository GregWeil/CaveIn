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
  validate(replay: Replay): boolean|null;
}

const { Provider, Consumer } = createContext<Context>({validate

export class ReplayValidator extends Component<Props, State> {
  state = {validated: new WeakMap()}
  render({children}: Props, {validated}: State) {
    return children;
  }
}