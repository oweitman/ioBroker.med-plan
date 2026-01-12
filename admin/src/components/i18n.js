// src-admin/src/components/i18n.js
import I18n from '@iobroker/adapter-react/i18n';

/**
 * Temporary i18n helper for JS/JSX (avoids strict key typing).
 *
 * @param {string} key key string
 */
// eslint-disable-next-line jsdoc/no-types
export const t = key => I18n.t(/** @type {any} */(key));
