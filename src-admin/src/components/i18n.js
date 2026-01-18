import { I18n } from '@iobroker/adapter-react-v5';

// eslint-disable-next-line jsdoc/check-tag-names
/** @typedef {keyof import('../i18n/en.json')} AdminWord */

/**
 * @param {AdminWord} word word
 * @param {...string} args args
 */
export const t = (word, ...args) => I18n.t(word, ...args);
