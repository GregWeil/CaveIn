/// settings.ts
//Fullscreen toggle, plus music and audio handling

import { Howler, Howl } from 'howler';

const audioMusic = new Howl({ preload: false, src: ['/assets/cavein.wav'] });
let audioMusicId: number | null = null;

audioMusic.on('end', () => {
  audioMusicId = audioMusic.play();
}).on('play', () => {
  document.body.classList.add('music-enabled');
}).on('pause', () => {
  document.body.classList.remove('music-enabled');
});

export function music(enable?: boolean) {
  if (enable === undefined) {
    enable = !localStorage.getItem('no-music');
  } else if (enable) {
    localStorage.removeItem('no-music');
  } else {
    localStorage.setItem('no-music', 'true');
  }
  
  //Make sure the page is visible
  if (document.hidden) {
    enable = false;
  }
  
  if (audioMusicId === null) {
    if (enable) {
      audioMusicId = audioMusic.play();
    }
  } else if (enable) {
    audioMusic.play(audioMusicId);
  } else {
    audioMusic.pause(audioMusicId);
  }
}

// Fullscreen toggling

export function fullscreenEnter() {
  const element: any = document.documentElement;
  const names = [
    'requestFullscreen',
    'webkitRequestFullscreen',
    'mozRequestFullScreen',
    'msRequestFullscreen'
  ];
  for (let i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
  (window.screen as any).lock('landscape');
};

export function fullscreenExit() {
  const element: any = document;
  const names = [
    'exitFullscreen',
    'webkitExitFullscreen',
    'mozCancelFullScreen',
    'msExitFullscreen'
  ];
  for (let i = 0; i < names.length; ++i) {
    if (element[names[i]]) {
      element[names[i]]();
      break;
    }
  }
};

// Attach event listeners

export function initialize() {
  window.addEventListener('visibilitychange', () => {
    Howler.mute(document.hidden);
    music();
  });
  
  audioMusic.once('load', () => {
    document.body.classList.add('music-loaded');
    music();
  }).load();
  
  const listeners: { [key: string]: () => void } = {
    'enable-music': () => music(true),
    'disable-music': () => music(false),
    'enter-fullscreen': () => fullscreenEnter(),
    'exit-fullscreen': () => fullscreenExit(),
  };
  document.addEventListener('click', (evt) => {
    const target = (evt.target as HTMLElement).closest('a');
    Object.entries(listeners).forEach(([key, func]) => {
      if (target.is('[data-onclick-' + key + ']')) {
        func();
      }
    });
  });
}