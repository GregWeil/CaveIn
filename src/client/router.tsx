/// router.tsx
// Track page url

import { h, Component, FunctionalComponent, ComponentChild } from 'preact';
import { createContext } from 'preact-context';

interface Context {
  navigate(page: string): void;
  redirect(page: string): void;
}

const { Provider, Consumer } = createContext<Context>({navigate: () => {}, redirect: () => {}});

interface Props {
  children(page: string, key: number): ComponentChild;
}

interface State {
  page: string;
  key: number;
}

export class Router extends Component<Props, State> {
  state = {page: window.location.hash, key: 0}
  onHashChange() {
    this.setState({
      page: window.location.hash,
      key: Math.random(),
    });
  }
  componentDidMount() {
    this.onHashChange = this.onHashChange.bind(this);
    window.addEventListener('hashchange', this.onHashChange);
  }
  componentWillUnmount() {
    window.removeEventListener('hashchange', this.onHashChange);
  }
  render() {
    const {page, key} = this.state;
    return this.props.children(page, key);
  }
}

export const Link: FunctionalComponent = ({children, href, ...props}) => (
  <a href={href} {...props}>{children}</a>
);