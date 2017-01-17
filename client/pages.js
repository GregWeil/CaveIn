/// pages.js
//A really basic single page app system

var _ = require('underscore');
var $ = require('jquery');

class Page {
  constructor(config) {
    this.config = config;
    this.name = config.name;
    this.selector = config.selector;
    this.funcSetup = config.setup || _.noop;
    this.funcTeardown = config.teardown || _.noop;
    this.active = false;
  }
  
  setup() {
    if (this.selector) {
      $(this.selector).show();
    }
    this.funcSetup();
    this.active = true;
  }
  
  teardown() {
    if (this.selector) {
      $(this.selector).hide();
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

function getPage(name) {
  if (pages[name]) {
    return pages[name];
  }
  return home;
}

function setPage(page) {
  if (_.isString(page)) {
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
    window.location.hash = newHash;
  }
}

function initialize() {
  setPage(getCurrentHash());
  $(window).on('hashchange', function (evt) {
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
  navigate: navigate,
  setup: initialize
};