import { I18n } from '@iobroker/adapter-react-v5';

/** @typedef {keyof import('../i18n/en.json')} AdminWord */

/**
 * @param {AdminWord} word
 * @param {...string} args
 */
export const t = (word, ...args) => I18n.t(word, ...args);
