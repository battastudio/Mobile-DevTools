'use strict';
// The section/field MODEL the config UI renders. Pure data — no logic. Split into
// core + platform groups (line cap); this barrel keeps the SECTIONS import stable.

const { coreSections } = require('./sections-core');
const { platformSections } = require('./sections-platform');

const SECTIONS = [...coreSections, ...platformSections];

module.exports = { SECTIONS };
