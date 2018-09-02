/// router.tsx
// Track page url

import { h, Component, FunctionalComponent, ComponentChildren } from 'preact';
import { createContext } from 'preact-context';

interface Context {
  navigate(page: string): void;
  redirect(page: string): void;
}

const { Provider, Consumer } = createContext<Context>({navigate: () => {}, redirect: () => {}});

interface Props {
  children: [(page: string, key: number) => ComponentChildren];
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
    const navigate = (page: string) => window.location.assign(page);
    const redirect = (page: string) => window.location.replace(page);
    return (
      <Provider value={{navigate, redirect}}>
        {this.props.children[0](page, key)}
      </Provider>
    );
  }
}

export const RouterConsumer = ({children}: {children: (ctx: Context) => ComponentChildren}) => (
  <Consumer>
    {children}
  </Consumer>
);

export const Link: FunctionalComponent = ({children, ...props}) => (
  <RouterConsumer>
    {({navigate}) => {
      const onClick = (event: Event) => {
        event.preventDefault();
        navigate((event.target as HTMLAnchorElement).href);
      };
      return <a onClick={onClick} {...props}>{children}</a>;
    }}
  </RouterConsumer>
);