/// pages.js
//A really basic single page app system

var $ = require('jquery');

class Page {
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
      document.querySelector(this.selector).classList.add('visible');
    }
    this.funcSetup();
    this.active = true;
  }
  
  teardown() {
    if (this.selector) {
      document.querySelector(this.selector).classList.remove('visible')
    }
    this.funcTeardown();
    this.active = false;
  }
}

var pages = {};
var home = null;

var current = null;

function registerPage(page) {
  pages[page.name] = page;
}

function registerHome(page) {
  registerPage(page);
  home = page;
}

function registerRedirect(from, to, func) {
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

function navigate(name) {
  var newHash = (getPage(name) !== home) ? name : '';
  if (getCurrentHash() === newHash) {
    setPage(name);
  } else {
    window.location.assign('#' + newHash);
  }
}

function initialize() {
  setPage(getCurrentHash());
  window.addEventListener('hashchange', evt => {
    setPage(getCurrentHash());
  });
  $(document.body).on('click', 'a[href^="#"]', function(evt) {
    var link = $(evt.target).closest('a');
    navigate(link.attr('href').slice(1));
    evt.preventDefault();
  });
}

module.exports = {
  Page: Page,
  add: registerPage,
  home: registerHome,
  redirect: registerRedirect,
  navigate: navigate,
  setup: initialize
};