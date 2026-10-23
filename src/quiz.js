const STATES = new Set(['idle', 'active', 'correct', 'completed', 'revealed']);

export function createQuiz(config, { render, onComplete }) {
  const questions = config.questions;
  const initial = () => ({ status: 'idle', index: 0, correctIds: [], attempts: {}, revealed: false });
  let state = initial();
  let locked = false;
  let timer;

  if (!config.persistProgress && config.storageKey) {
    try { sessionStorage.removeItem(config.storageKey); } catch { /* Storage can be unavailable. */ }
  }

  if (config.persistProgress) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(config.storageKey) || 'null');
      const validIds = questions.slice(0, saved?.index).map(question => question.id);
      if (saved && STATES.has(saved.status) && Number.isInteger(saved.index) && saved.index >= 0 && saved.index <= questions.length &&
          Array.isArray(saved.correctIds) && saved.correctIds.length === saved.index && saved.correctIds.every((id, i) => id === validIds[i])) {
        state = { ...initial(), index: saved.index, correctIds: saved.correctIds,
          attempts: saved.attempts && typeof saved.attempts === 'object' ? saved.attempts : {},
          revealed: saved.revealed === true,
          status: saved.revealed ? 'revealed' : saved.index === questions.length ? 'completed' : 'idle' };
      }
    } catch { /* Storage can be unavailable. The experience remains usable. */ }
  }

  const save = () => {
    if (!config.persistProgress) return;
    try { sessionStorage.setItem(config.storageKey, JSON.stringify(state)); } catch { /* Optional persistence. */ }
  };
  const emit = (feedback = '', selected = '') => render({ ...state, attempts: { ...state.attempts } }, feedback, selected);

  function open() {
    clearTimeout(timer);
    locked = false;
    if (config.resetOnOpen) state = initial();
    if (state.status === 'correct' || state.status === 'idle') state.status = 'active';
    emit();
    return state.status;
  }

  function answer(optionId) {
    if (locked || state.status !== 'active') return;
    const question = questions[state.index];
    if (!question?.options.some(option => option.id === optionId)) return;
    if (optionId === question.correctOptionId) {
      locked = true;
      state.status = 'correct';
      emit('¡Exacto!', optionId);
      timer = setTimeout(() => {
        state.correctIds.push(question.id);
        state.index++;
        locked = false;
        state.status = state.index === questions.length ? 'completed' : 'active';
        save();
        emit();
        if (state.status === 'completed') onComplete();
      }, 850);
      return;
    }
    const count = (Number(state.attempts[question.id]) || 0) + 1;
    state.attempts[question.id] = count;
    save();
    let feedback = count === 1 ? '¡Casi! Intenta otra vez.' : count === 2 ? 'Estuviste muy cerca. Piénsalo un poquito más.' :
      config.allowHints ? count === 3 ? question.hint : question.explicitHint || question.hint : 'Puedes intentarlo de nuevo.';
    emit(feedback, optionId);
  }

  function reveal() {
    if (state.status !== 'completed' && state.status !== 'revealed') return false;
    state.status = 'revealed';
    state.revealed = true;
    save();
    emit();
    return true;
  }

  function close() {
    clearTimeout(timer);
    locked = false;
    if (state.status === 'correct') state.status = 'active';
    save();
  }

  return { open, answer, reveal, close, getState: () => ({ ...state }) };
}
