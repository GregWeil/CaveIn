/// pages.js
//A really basic single page app system

interface PageConfig {
  name: string;
  selector?: string;
  setup?: () => void;
  teardown?: () => void;
}

export class Page {
  name: string;
  selector: string | null;
  funcSetup: () => void;
  funcTeardown: () => void;
  active: boolean
  
  constructor(config: PageConfig) {
    this.name = config.name;
    this.selector = config.selector || null;
    this.funcSetup = config.setup || (() => {});
    this.funcTeardown = config.teardown || (() => {});
    this.active = false;
  }
  
  setup() {
    if (this.selector) {
      document.querySelector(this.selector)!.classList.remove('hidden');
    }
    this.funcSetup();
    this.active = true;
  }
  
  teardown() {
    if (this.selector) {
      document.querySelector(this.selector)!.classList.add('hidden')
    }
    this.funcTeardown();
    this.active = false;
  }
}

const pages: { [key: string]: Page } = {};
let home: Page | null = null;

let current: Page | null = null;

export function registerPage(page: Page) {
  pages[page.name] = page;
}

export function registerHome(page: Page) {
  registerPage(page);
  home = page;
}

export function registerRedirect(from: string, to: string, func: () => void) {
  registerPage(new Page({
    name: from,
    setup: () => {
      setTimeout(() => { window.location.replace('#' + to); }, 0);
      func();
    }
  }))
}

function getPage(name: string) {
  if (name in pages) {
    return pages[name];
  }
  return home;
}

function setPage(name?: string) {
  if (current) {
    current.teardown();
  }
  current = name ? getPage(name) : home;
  if (current) {
    current.setup();
  }
}

function getCurrentHash() {
  return window.location.hash.slice(1);
}

export function navigate(name: string) {
  const newHash = (getPage(name) !== home) ? name : '';
  if (getCurrentHash() === newHash) {
    setPage(name);
  } else {
    window.location.assign('#' + newHash);
  }
}

export function initialize() {
  document.querySelectorAll('.page').forEach(pg => pg.classList.add('hidden'));
  window.addEventListener('hashchange', evt => setPage(getCurrentHash()));
  setPage(getCurrentHash());
}