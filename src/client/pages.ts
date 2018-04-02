/// pages.js
//A really basic single page app system

export class Page {
  config: any;
  name: string;
  selector: string;
  funcSetup: () => void;
  funcTeardown: () => void;
  active: boolean
  
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.selector = config.selector;
    this.funcSetup = config.setup || (() => {});
    this.funcTeardown = config.teardown || (() => {});
    this.active = false;
  }
  
  setup() {
    if (this.selector) {
      document.querySelector(this.selector).classList.remove('hidden');
    }
    this.funcSetup();
    this.active = true;
  }
  
  teardown() {
    if (this.selector) {
      document.querySelector(this.selector).classList.add('hidden')
    }
    this.funcTeardown();
    this.active = false;
  }
}

var pages = {};
var home = null;

var current = null;

export function registerPage(page) {
  pages[page.name] = page;
}

export function registerHome(page) {
  registerPage(page);
  home = page;
}

export function registerRedirect(from, to, func) {
  registerPage(new Page({
    name: from,
    setup: function() {
      setTimeout(() => { window.location.replace('#' + to); }, 0);
      func();
    }
  }))
}

function getPage(name) {
  if (pages[name]) {
    return pages[name];
  }
  return home;
}

function setPage(page) {
  if (page !== undefined) {
    page = getPage(page);
  }
  if (current) {
    current.teardown();
  }
  current = page || home;
  if (current) {
    current.setup();
  }
}

function getCurrentHash() {
  return window.location.hash.slice(1);
}

export function navigate(name) {
  var newHash = (getPage(name) !== home) ? name : '';
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
  document.body.addEventListener('click', evt => {
    var link = evt.target.closest('a[href^="#"]') as HTMLAnchorElement;
    if (link) {
      navigate(link.href.slice(1));
      evt.preventDefault();
    }
  });
}