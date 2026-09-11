'use strict';
// Fleet roll-up: every scanned app × its OWASP-Mobile category statuses, weakest-graded first.
// Powers the dashboard heatmap.
const { readCache } = require('./store');

function fleetData() {
  return Object.values(readCache()).filter((r) => r.grade).map((r) => {
    const std = (r.compliance && r.compliance.mobile) || (r.compliance && Object.values(r.compliance)[0]) || null;
    const categories = {}; (std ? std.categories : []).forEach((k) => (categories[k.owasp] = k.status));
    return { name: r.name, path: r.path, grade: r.grade, standard: std ? std.label : '', categories };
  }).sort((a, b) => a.grade.score - b.grade.score);
}

module.exports = { fleetData };
