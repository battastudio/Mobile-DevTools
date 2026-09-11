'use strict';
// OWASP Mobile M4 — Insufficient input validation & insecure local auth: raw SQL string-building in
// a local database, and weakly-configured biometric/local_auth.
const { grepLib, libHas, fmtHits } = require('../files');

const FIX_SQL = 'Never interpolate values into raw SQL. Use parameterized queries: db.rawQuery("SELECT * FROM t WHERE id = ?", [id]) or the query() helper with whereArgs. Validate/whitelist any dynamic column/table names.';
const FIX_BIOMETRIC = 'Call local_auth with AuthenticationOptions(biometricOnly: true, stickyAuth: true), handle the error codes (notAvailable/lockedOut), and bind a successful prompt to a server-verified step — never trust the boolean alone on a rooted device.';

module.exports = [
  { id: 'sql-injection-local', title: 'SQL injection in local database query', category: 'Injection', owasp: 'M4', severity: 'med',
    scenario: 'Building a raw SQL string with interpolated input (sqflite rawQuery/rawInsert) lets crafted input alter the query — reading or destroying local data, or bypassing client-side auth stored in the db.',
    run(ctx) {
      const hits = grepLib(ctx, /raw(Query|Insert|Update|Delete)\s*\(\s*['"].*\$/);
      if (!hits.length) return { status: 'ok', evidence: 'No interpolated raw SQL found.' };
      return { status: 'fail', evidence: 'Interpolated string in a raw SQL query (use ? placeholders + whereArgs):\n' + fmtHits(hits), fix: FIX_SQL };
    } },
  { id: 'weak-biometric', title: 'Weak biometric / local-auth configuration', category: 'Authentication', owasp: 'M4', severity: 'med',
    scenario: 'local_auth called without biometricOnly (device PIN fallback accepted) or without stickyAuth/error handling can be bypassed or downgraded, and treating biometric success alone (no server binding) as authentication is trivially bypassed on a rooted device.',
    run(ctx) {
      if (!/local_auth/.test(ctx.pubspec) && !libHas(ctx, /LocalAuthentication\(|\.authenticate\(/)) return { status: 'na', evidence: 'No local_auth / biometric usage detected.' };
      const calls = grepLib(ctx, /\.authenticate\(/);
      const biometricOnly = libHas(ctx, /biometricOnly\s*:\s*true/);
      const sticky = libHas(ctx, /stickyAuth\s*:\s*true/);
      if (biometricOnly && sticky) return { status: 'ok', evidence: 'Biometric auth uses biometricOnly + stickyAuth.' };
      return { status: 'warn', evidence: `Biometric/local auth found${biometricOnly ? '' : ' without biometricOnly:true'}${sticky ? '' : ' without stickyAuth:true'} — harden the options and bind auth to a server-verified action:\n` + fmtHits(calls.slice(0, 3)), fix: FIX_BIOMETRIC };
    } },
];
