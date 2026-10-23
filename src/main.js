import { config } from './config.js';
import { createAudioPlayer, pauseAllAudio } from './audio.js';
import { createQuiz } from './quiz.js';

const app = document.querySelector('#app');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const node = (tag, className = '', content = '') => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (content) element.textContent = content;
  return element;
};
const add = (parent, ...children) => { parent.append(...children); return parent; };
const button = (label, className = 'button') => {
  const element = node('button', className, label);
  element.type = 'button';
  return element;
};
const heading = (eyebrow, title) => add(node('div', 'section-heading'), node('p', 'eyebrow', eyebrow), node('h2', 'section-title', title));
const section = (className, label) => {
  const element = node('section', className + ' reveal');
  element.setAttribute('aria-label', label);
  return element;
};
const art = (className, label) => add(node('div', `photo-art ${className}`), node('span', 'art-sun'), node('span', 'art-arch'), node('span', 'art-label', label));

function photo(image, alt, className, position = 'center', desktopImage = '', desktopPosition = 'center') {
  const frame = node('div', `photo-frame ${className}`);
  frame.style.setProperty('--image-position', position);
  frame.style.setProperty('--desktop-position', desktopPosition);
  const fallback = art('photo-fallback', 'un instante nuestro');
  fallback.setAttribute('role', 'img');
  fallback.setAttribute('aria-label', `Espacio reservado para: ${alt}`);
  add(frame, fallback);
  if (image) {
    const img = node('img');
    img.src = image;
    img.alt = alt;
    img.loading = className === 'hero-image' ? 'eager' : 'lazy';
    if (className === 'hero-image') img.fetchPriority = 'high';
    img.addEventListener('load', () => { fallback.setAttribute('aria-hidden', 'true'); frame.classList.add('has-image'); });
    img.addEventListener('error', () => img.remove());
    if (desktopImage) {
      const picture = node('picture');
      const source = node('source');
      source.media = '(min-width: 701px)';
      source.srcset = desktopImage;
      add(picture, source, img);
      frame.append(picture);
    } else frame.append(img);
  }
  return frame;
}

function welcome() {
  const data = config.welcome;
  const scene = node('div', 'welcome-screen');
  scene.setAttribute('role', 'dialog');
  scene.setAttribute('aria-modal', 'true');
  scene.setAttribute('aria-labelledby', 'welcome-title');
  const card = node('div', 'welcome-card');
  const title = node('h1', 'welcome-title', data.title);
  title.id = 'welcome-title';
  const tapsNeeded = Math.max(1, Number(data.heartTaps) || 3);
  const open = button('♥', 'welcome-heart');
  open.setAttribute('aria-label', `${data.button}: toca el corazón ${tapsNeeded} veces`);
  const instruction = node('p', 'welcome-instruction', data.heartInstruction);
  instruction.setAttribute('aria-live', 'polite');
  const progress = node('div', 'welcome-progress');
  progress.setAttribute('aria-hidden', 'true');
  const dots = Array.from({ length: tapsNeeded }, () => node('span', 'welcome-dot'));
  progress.append(...dots);
  add(card, node('p', 'eyebrow', data.eyebrow), title,
    node('p', 'welcome-copy', data.message), open, instruction, progress);
  add(scene, card);
  let opening = false;
  let taps = 0;
  open.addEventListener('click', () => {
    if (opening) return;
    taps += 1;
    dots[taps - 1].classList.add('is-lit');
    open.classList.remove('is-tapped');
    void open.offsetWidth;
    open.classList.add('is-tapped');
    if (taps < tapsNeeded) {
      instruction.textContent = `${taps} de ${tapsNeeded} latidos. ${data.heartInstruction}`;
      open.setAttribute('aria-label', `${data.button}: faltan ${tapsNeeded - taps} toques`);
      return;
    }
    opening = true;
    open.disabled = true;
    instruction.textContent = data.button;
    scene.classList.add('is-leaving');
    const finish = () => {
      scene.remove();
      document.body.classList.remove('is-locked');
      document.querySelector('.story').inert = false;
      const hero = document.querySelector('.hero');
      hero.classList.add('is-visible');
      hero.querySelector('h1')?.focus({ preventScroll: true });
    };
    if (reduceMotion.matches) finish();
    else setTimeout(finish, 480);
  });
  return scene;
}

function hero() {
  const data = config.hero;
  const wrap = section('hero', 'Portada');
  const image = photo(data.image, `Fotografía de ${config.recipient.name} y ${config.sender.name}`, 'hero-image', data.imagePosition, data.desktopImage, data.desktopImagePosition);
  const content = node('div', 'hero-content');
  const name = node('h1', 'hero-name', config.recipient.name);
  name.tabIndex = -1;
  add(content, node('p', 'eyebrow', data.eyebrow), node('span', 'hero-heart', '♥'), name,
    node('p', 'hero-subtitle', data.subtitle), node('span', 'hero-rule'),
    node('p', 'hero-date-caption', data.dateCaption), node('p', 'hero-date', data.date),
    node('p', 'scroll-cue', 'Desliza para continuar ↓'));
  return add(wrap, image, node('div', 'hero-shade'), content);
}

function audioControls(file, visual) {
  const play = button('▶', 'play-button');
  play.setAttribute('aria-label', 'Reproducir audio');
  const status = node('span', 'audio-status');
  status.setAttribute('aria-live', 'polite');
  const current = node('span', 'audio-time', '0:00');
  const duration = node('span', 'audio-time', '0:00');
  const progress = node('input', 'audio-progress');
  progress.type = 'range'; progress.min = '0'; progress.max = '0'; progress.value = '0'; progress.disabled = true;
  progress.setAttribute('aria-label', 'Posición del audio');
  const player = createAudioPlayer({ file, button: play, status, progress, current, duration, visual });
  return { play, status, player, timeline: add(node('div', 'audio-timeline'), current, progress, duration) };
}

function music() {
  const data = config.music;
  const wrap = section('music-section section-pad', data.eyebrow);
  const inner = node('div', 'content-width');
  const disc = node('div', 'record');
  if (data.cover) {
    const image = node('img'); image.src = data.cover; image.alt = 'Portada de nuestra canción';
    image.addEventListener('error', () => image.remove());
    disc.append(image);
  }
  add(disc, node('span', 'record-center', '♥'));
  const selected = data.tracks[0];
  const controls = audioControls(selected?.file, disc);
  const title = node('h3', 'media-title', selected?.title || 'Nuestra música');
  const playlist = node('div', 'music-playlist');
  playlist.setAttribute('role', 'group');
  playlist.setAttribute('aria-label', 'Elige una canción');
  const trackButtons = data.tracks.map((track, index) => {
    const option = button('', 'track-button');
    option.setAttribute('aria-pressed', String(index === 0));
    option.classList.toggle('is-selected', index === 0);
    add(option, node('span', 'track-number', String(index + 1).padStart(2, '0')), node('span', 'track-title', track.title));
    option.addEventListener('click', () => {
      if (option.classList.contains('is-selected')) return;
      controls.player.setTrack(track.file);
      title.textContent = track.title;
      trackButtons.forEach(choice => {
        const active = choice === option;
        choice.classList.toggle('is-selected', active);
        choice.setAttribute('aria-pressed', String(active));
      });
    });
    return option;
  });
  playlist.append(...trackButtons);
  const details = add(node('div', 'music-details'), title,
    node('p', 'media-subtitle', data.description),
    add(node('div', 'music-transport'), controls.play, controls.status), controls.timeline, playlist);
  add(inner, heading(data.eyebrow, data.sectionTitle),
    add(node('div', 'music-player'), add(node('div', 'music-art'), disc), details));
  return add(wrap, inner);
}

function memories() {
  const wrap = section('memories-section section-pad', 'Recuerdos fotográficos');
  const inner = node('div', 'content-width');
  add(inner, heading(config.memoriesSection.eyebrow, config.memoriesSection.title));
  const list = node('div', 'memory-list');
  config.memories.forEach((item, index) => {
    const card = node('article', `memory-card reveal ${index % 2 ? 'memory-reverse' : ''}`);
    card.style.setProperty('--memory-accent', item.accent || 'var(--color-text)');
    const copy = add(node('div', 'memory-copy'), node('p', 'eyebrow', item.date || `Recuerdo ${index + 1}`),
      node('h3', 'memory-title', item.title), node('p', '', item.description), node('span', 'memory-number', item.art || String(index + 1).padStart(2, '0')));
    add(card, photo(item.image, item.alt || item.title, `memory-image ${item.orientation === 'portrait' ? 'memory-image--portrait' : ''}`, item.imagePosition), copy);
    list.append(card);
  });
  add(inner, list);
  if (config.gallery.length) {
    const gallery = node('div', 'gallery-block');
    const track = node('div', 'gallery-track');
    track.tabIndex = 0;
    track.setAttribute('aria-label', 'Galería de recuerdos. Desliza horizontalmente para ver más fotografías.');
    config.gallery.forEach((item, index) => {
      const figure = node('figure', 'gallery-item');
      add(figure, photo(item.image, item.alt, 'gallery-image'), node('figcaption', '', item.caption));
      track.append(figure);
    });
    const previous = button('←', 'gallery-button'); previous.setAttribute('aria-label', 'Fotografía anterior');
    const next = button('→', 'gallery-button'); next.setAttribute('aria-label', 'Fotografía siguiente');
    const move = direction => {
      const itemWidth = track.querySelector('.gallery-item').getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      track.scrollBy({ left: direction * (itemWidth + gap), behavior: reduceMotion.matches ? 'instant' : 'smooth' });
    };
    previous.addEventListener('click', () => move(-1)); next.addEventListener('click', () => move(1));
    add(gallery, node('p', 'eyebrow', config.memoriesSection.galleryEyebrow), track, add(node('div', 'gallery-actions'), previous, next));
    inner.append(gallery);
  }
  return add(wrap, inner);
}

function letter() {
  const data = config.letter;
  const wrap = section('letter-section section-pad', data.title);
  const card = node('article', 'letter-card narrow');
  add(card, node('span', 'ornament', '♥'), heading(data.eyebrow, data.title), node('p', 'letter-salutation', data.salutation));
  data.paragraphs.forEach(paragraph => card.append(node('p', 'letter-paragraph', paragraph)));
  add(card, node('p', 'letter-signature', data.signature));
  return add(wrap, card);
}

function heart() {
  const data = config.heart;
  const wrap = section('heart-section section-pad', data.title);
  const inner = node('div', 'narrow center');
  const touch = button('♥', 'big-heart');
  touch.setAttribute('aria-label', 'Mostrar el siguiente recuerdo');
  const message = node('p', 'heart-message', data.instruction);
  message.setAttribute('aria-live', 'polite');
  let index = 0;
  touch.addEventListener('click', () => {
    message.classList.remove('heart-message-in');
    void message.offsetWidth;
    message.textContent = index < data.memories.length ? data.memories[index++] : data.finalMessage;
    message.classList.add('heart-message-in');
    const burst = node('span', 'heart-burst', '♥ ♥ ♥'); burst.setAttribute('aria-hidden', 'true');
    touch.parentElement.append(burst); setTimeout(() => burst.remove(), 900);
    if (index >= data.memories.length) {
      touch.disabled = true;
      touch.setAttribute('aria-label', 'Todos los recuerdos revelados');
      setTimeout(() => { message.textContent = data.finalMessage; }, reduceMotion.matches ? 0 : 1100);
    }
  });
  add(inner, heading(data.eyebrow, data.title), node('p', 'heart-instruction', data.instruction),
    add(node('div', 'heart-stage'), touch), message,
    node('p', 'continue-cue', data.continueCue));
  return add(wrap, inner);
}

let quiz;
let overlay;
let lastFocus;
let savedScroll = 0;
let visibleQuestionId = null;

function closeOverlay() {
  if (!overlay || overlay.hidden) return;
  quiz.close();
  overlay.hidden = true;
  document.body.classList.remove('is-locked');
  document.querySelector('.story').inert = false;
  window.scrollTo({ top: savedScroll, behavior: 'instant' });
  lastFocus?.focus({ preventScroll: true });
}

function surprise() {
  const data = config.surprise;
  const wrap = section('surprise-section section-pad', data.title);
  const inner = node('div', 'narrow center');
  const open = button(data.button);
  open.addEventListener('click', () => {
    savedScroll = window.scrollY;
    lastFocus = document.activeElement;
    pauseAllAudio();
    overlay.hidden = false;
    document.body.classList.add('is-locked');
    document.querySelector('.story').inert = true;
    const status = quiz.open();
    if (status === 'completed' || status === 'revealed') showInvitation();
    overlay.querySelector('.overlay-close').focus();
  });
  return add(wrap, add(inner, node('span', 'ornament', '♥'), heading(data.eyebrow, data.title),
    node('p', 'surprise-copy', data.message), open));
}

function credits() {
  const footer = node('footer', 'credit-footer');
  const panda = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  panda.classList.add('panda-icon');
  panda.setAttribute('viewBox', '0 0 64 64');
  panda.setAttribute('role', 'img');
  panda.setAttribute('aria-label', 'Icono de panda');
  const parts = [
    ['circle', { cx: 15, cy: 16, r: 10, fill: '#30242a' }],
    ['circle', { cx: 49, cy: 16, r: 10, fill: '#30242a' }],
    ['ellipse', { cx: 32, cy: 35, rx: 27, ry: 25, fill: '#fff', stroke: '#30242a', 'stroke-width': 2 }],
    ['ellipse', { cx: 21, cy: 32, rx: 8, ry: 10, fill: '#30242a', transform: 'rotate(-18 21 32)' }],
    ['ellipse', { cx: 43, cy: 32, rx: 8, ry: 10, fill: '#30242a', transform: 'rotate(18 43 32)' }],
    ['circle', { cx: 23, cy: 31, r: 2, fill: '#fff' }],
    ['circle', { cx: 41, cy: 31, r: 2, fill: '#fff' }],
    ['ellipse', { cx: 32, cy: 44, rx: 5, ry: 3, fill: '#30242a' }],
    ['path', { d: 'M32 47 Q28 52 24 48 M32 47 Q36 52 40 48', fill: 'none', stroke: '#30242a', 'stroke-width': 2, 'stroke-linecap': 'round' }],
  ];
  parts.forEach(([tag, attributes]) => {
    const part = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([name, value]) => part.setAttribute(name, String(value)));
    panda.append(part);
  });
  return add(footer, panda, node('span', '', config.credits.text));
}

function makeOverlay() {
  overlay = node('div', 'overlay'); overlay.hidden = true;
  overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'La última sorpresa');
  const close = button('×', 'overlay-close'); close.setAttribute('aria-label', 'Cerrar y volver al regalo');
  close.addEventListener('click', closeOverlay);
  add(overlay, close, node('div', 'overlay-content'));
  overlay.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeOverlay();
    if (event.key !== 'Tab') return;
    const focusables = [...overlay.querySelectorAll('button:not([disabled]), a[href]')];
    if (!focusables.length) return;
    const first = focusables[0], last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  return overlay;
}

function showQuestion(feedback = '', selected = '', state = quiz.getState()) {
  if (overlay.hidden || state.index >= config.quiz.questions.length) return;
  const data = config.quiz;
  const question = data.questions[state.index];
  const questionChanged = visibleQuestionId !== question.id;
  visibleQuestionId = question.id;
  const content = overlay.querySelector('.overlay-content'); content.replaceChildren();
  const intro = add(node('div', 'quiz-intro'), node('p', 'eyebrow', data.eyebrow),
    node('h2', 'section-title', data.title), node('p', '', data.introduction));
  const card = node('div', 'quiz-card');
  const progressText = node('p', 'eyebrow', `Pregunta ${state.index + 1} de ${data.questions.length}`);
  const meter = node('div', 'quiz-progress'); meter.setAttribute('role', 'progressbar');
  const completed = state.correctIds.length + (state.status === 'correct' ? 1 : 0);
  meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', String(data.questions.length));
  meter.setAttribute('aria-valuenow', String(completed));
  const fill = node('span'); fill.style.transform = `scaleX(${completed / data.questions.length})`; meter.append(fill);
  const title = node('h3', 'quiz-question', question.text);
  title.tabIndex = -1;
  const choices = node('div', 'quiz-options');
  question.options.forEach(option => {
    const choice = button(option.label, 'quiz-option');
    if (selected === option.id) choice.classList.add(state.status === 'correct' ? 'is-correct' : 'is-wrong');
    choice.disabled = state.status === 'correct';
    choice.addEventListener('click', () => quiz.answer(option.id)); choices.append(choice);
  });
  const message = node('p', 'quiz-feedback', feedback); message.setAttribute('aria-live', 'polite');
  add(card, progressText, meter, title, choices, message);
  add(content, intro, card);
  if (selected && state.status === 'active') {
    choices.querySelector('.is-wrong')?.focus({ preventScroll: true });
  } else if (questionChanged && !selected) {
    title.focus({ preventScroll: true });
  }
}

function showInvitation() {
  if (overlay.hidden || !quiz.reveal()) return;
  const data = config.invitation;
  const content = overlay.querySelector('.overlay-content'); content.replaceChildren();
  const reveal = node('div', 'reveal-screen');
  const hearts = node('div', 'floating-hearts'); hearts.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 9; i++) {
    const heart = node('span', '', '♥');
    heart.style.setProperty('--x', `${8 + (i * 37) % 84}%`);
    heart.style.setProperty('--delay', `${(i % 5) * 0.18}s`);
    hearts.append(heart);
  }
  const header = add(node('div', 'reveal-header'), node('p', 'eyebrow', 'Una sorpresa solo para ti'),
    node('h2', 'section-title', data.eyebrow), node('p', '', data.message));
  const coupon = node('div', 'coupon');
  add(coupon, node('span', 'ornament', '♥'), node('p', 'eyebrow', data.title),
    node('h3', 'coupon-offer', data.offer), node('p', 'coupon-note', data.note));
  if (data.date) coupon.append(node('p', 'coupon-detail', data.date));
  if (data.time) coupon.append(node('p', 'coupon-detail', data.time));
  coupon.append(node('p', 'coupon-signature', `Con amor, ${data.signature}`));
  const back = button('Volver al regalo'); back.addEventListener('click', closeOverlay);
  add(reveal, hearts, header, coupon, back);
  if (data.whatsappNumber) {
    const share = node('a', 'text-link', 'Compartir por WhatsApp');
    const number = data.whatsappNumber.replace(/\D/g, '');
    share.href = `https://wa.me/${number}?text=${encodeURIComponent(`Acepto tu invitación, ${config.sender.name}. ♥`)}`;
    share.target = '_blank'; share.rel = 'noopener noreferrer';
    reveal.append(share);
  }
  reveal.append(credits());
  content.append(reveal);
  requestAnimationFrame(() => reveal.classList.add('is-shown'));
}

function init() {
  document.title = `Un regalo para ${config.recipient.name}`;
  const root = document.documentElement;
  Object.entries(config.theme).forEach(([key, value]) => root.style.setProperty(`--color-${key}`, value));
  const story = node('main', 'story');
  story.inert = true;
  // Cambia el orden de esta lista para reordenar escenas sin tocar su lógica.
  const scenes = [hero, music, memories, letter, heart, surprise];
  scenes.forEach(render => story.append(render()));
  story.append(credits());
  add(app, story, makeOverlay(), welcome());
  quiz = createQuiz(config.quiz, {
    render: (state, feedback, selected) => {
      if (state.status === 'active' || state.status === 'correct') showQuestion(feedback, selected, state);
    },
    onComplete: showInvitation,
  });
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal:not(.hero)').forEach(element => observer.observe(element));
  window.addEventListener('pagehide', pauseAllAudio);
}

init();
