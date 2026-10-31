import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const MAX_HISTORY = 5000;

const EMPTY_STATE = {
  productUrl: null,
  thresholdChf: null,
  lastCheck: null,
  lastNotified: null,
  history: [],
};

export async function readState(file) {
  try {
    const raw = await readFile(file, 'utf8');
    return { ...EMPTY_STATE, ...JSON.parse(raw) };
  } catch (error) {
    if (error.code === 'ENOENT') return { ...EMPTY_STATE };
    throw new Error(`Could not read state file ${file}: ${error.message}`);
  }
}

export async function writeState(file, state) {
  const trimmed = {
    ...state,
    history: state.history.slice(-MAX_HISTORY),
  };
  await mkdir(dirname(file), { recursive: true });
  // Write to a temp file first so an interrupted write cannot corrupt the state.
  const tmp = `${file}.tmp`;
  await writeFile(tmp, `${JSON.stringify(trimmed, null, 2)}\n`, 'utf8');
  await rename(tmp, file);
}

export function appendHistory(state, entry) {
  return [...state.history, entry].slice(-MAX_HISTORY);
}
