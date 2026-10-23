const players = new Set();

export function createAudioPlayer({ file, button, status, progress, current, duration, visual }) {
  const audio = new Audio();
  audio.preload = 'metadata';
  players.add(audio);
  const format = seconds => Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}` : '0:00';
  const sync = () => {
    const playing = !audio.paused;
    button.setAttribute('aria-label', playing ? 'Pausar audio' : 'Reproducir audio');
    button.textContent = playing ? '❚❚' : '▶';
    visual?.classList.toggle('is-playing', playing);
    status.textContent = playing ? 'Reproduciendo' : audio.ended ? 'Terminó la reproducción' : 'Listo para reproducir';
  };

  const setTrack = nextFile => {
    audio.pause();
    current.textContent = '0:00';
    duration.textContent = '0:00';
    progress.value = '0';
    progress.max = '0';
    progress.style.setProperty('--progress', '0%');
    progress.disabled = true;
    button.disabled = !nextFile;
    visual?.classList.remove('is-playing');
    if (!nextFile) {
      audio.removeAttribute('src');
      status.textContent = 'Audio pendiente de agregar';
      return;
    }
    audio.src = nextFile;
    audio.load();
    sync();
  };

  button.addEventListener('click', async () => {
    if (!audio.paused) { audio.pause(); return; }
    for (const other of players) if (other !== audio) other.pause();
    try { await audio.play(); }
    catch { status.textContent = 'No se pudo reproducir. Prueba de nuevo o revisa el archivo.'; }
  });
  audio.addEventListener('play', sync);
  audio.addEventListener('pause', sync);
  audio.addEventListener('ended', sync);
  audio.addEventListener('loadedmetadata', () => {
    duration.textContent = format(audio.duration);
    progress.disabled = false;
    progress.max = String(audio.duration || 0);
  });
  audio.addEventListener('timeupdate', () => {
    current.textContent = format(audio.currentTime);
    progress.value = String(audio.currentTime);
    progress.style.setProperty('--progress', `${audio.duration ? (audio.currentTime / audio.duration) * 100 : 0}%`);
  });
  audio.addEventListener('error', () => {
    audio.pause();
    button.disabled = true;
    status.textContent = 'El archivo de audio no está disponible.';
  });
  progress.addEventListener('input', () => {
    if (Number.isFinite(audio.duration)) audio.currentTime = Number(progress.value);
  });
  setTrack(file);
  return { setTrack };
}

export function pauseAllAudio() {
  for (const audio of players) audio.pause();
}
