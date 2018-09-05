/// settings.tsx
//Fullscreen toggle, plus music and audio handling

import { Howler, Howl } from 'howler';
import fscreen from 'fscreen';

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

audioMusic.once('load', () => {
  document.body.classList.add('music-loaded');
  music();
});

// Fullscreen toggling

async function fullscreenEnter() {
  await fscreen.requestFullscreen(document.documentElement);
  (window as any).screen.orientation.lock('landscape');
};

async function fullscreenExit() {
  fscreen.exitFullscreen();
};

// Attach event listeners

export function initialize() {
  window.addEventListener('visibilitychange', () => {
    Howler.mute(document.hidden);
    music();
  });
  
  audioMusic.load();
}