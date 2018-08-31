/// types.ts
// Exports some interfaces that get used a bunch

i

export interface State {
  page: string;
};

export interface Actions {
  setPage: (page: string) => {page: string};
};