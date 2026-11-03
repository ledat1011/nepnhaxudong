'use strict';
// The GIF part needs npm packages that the PNG part does not. Loading them through need() turns a missing package
// into a message that says how to install them, instead of Node's "Cannot find module".
const path = require('path');

const SKILL_DIR = path.join(__dirname, '..', '..').replace(/\\/g, '/');

function need(name) {
  try {
    return require(name);
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') throw e;
    throw new Error(`GIF packages are missing (${name}). Run once: npm ci --prefix "${SKILL_DIR}"`);
  }
}

module.exports = { need };
