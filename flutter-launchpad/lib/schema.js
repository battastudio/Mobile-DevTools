'use strict';
// Flutter Launchpad config — the project-scaffold spec assembled in the UI and
// posted to /generate. Zero-dependency: no zod. `defaultConfig` is the literal
// default object; `parseConfig` deep-merges input over it with light coercion.
//
// `mode` picks the whole convention stack:
//   structured-getx     — opinionated GetX + general_exports mega-barrel
//   structured-riverpod — raw flutter_riverpod + GoRouter, same barrel
//   generic             — vanilla Flutter, layer folders, pick-your-own state mgmt

const LAUNCHPAD_MODES = ['structured-getx', 'structured-riverpod', 'generic'];
const STATE_MGMTS = ['getx', 'riverpod', 'bloc', 'provider', 'none'];
const ARCHITECTURES = ['feature-folder', 'layer-folder', 'clean', 'mvc', 'mvvm'];
const NAVIGATIONS = ['named-routes', 'go_router'];
const API_CLIENTS = ['api_request', 'dio', 'retrofit', 'http'];
const LOCALIZATIONS = ['none', 'intl', 'flutter_localization'];
const MODELS_CODEGEN = ['manual', 'freezed'];

// The canonical default config (every zod `.default(...)` transcribed literally).
const defaultConfig = {
  appName: 'my_app',
  orgId: 'com.example',
  mode: 'structured-getx',
  stateMgmt: 'getx',
  architecture: 'feature-folder',
  navigation: 'named-routes',
  interactivity: ['pull-refresh'],
  themes: ['light', 'dark'],
  localization: 'intl',
  connectivity: ['connectivity_plus'],
  apiClient: 'api_request',
  notifications: [],
  firebase: [],
  security: [],
  maps: [],
  components: ['cached_network_image', 'flutter_svg'],
  platform: { urlLauncher: false, keyboard: true, sfx: false, maintenance: 'none' },
  logging: ['consoleLog'],
  permissions: ['location', 'photos', 'notifications'],
  assets: ['launcher_icons', 'native_splash'],
  testing: true,
  features: ['splash', 'home'],
  flavors: ['dev', 'demo', 'prod'],
  nativeFlavors: false,
  models: [],
  modelsCodegen: 'manual',
  proBase: false,
  rules: [],
  customRules: [],
  env: false,
  navShell: false,
  consent: false,
  observability: [],
  firebaseConfig: { android: '', ios: '', androidPerFlavor: {} },
  deepLink: { scheme: '', hosts: [], routes: [] },
  identity: {
    displayName: '',
    description: '',
    version: '1.0.0+1',
    brandColor: '#1E5AF6',
    baseUrl: 'https://api.example.com/v1',
    baseUrlByFlavor: {},
    icon: { path: 'assets/icon/app_icon.png', url: '', adaptiveBackground: '#FFFFFF', foreground: '', foregroundUrl: '' },
    splash: { color: '#FFFFFF', image: 'assets/splash/logo.png', imageUrl: '', colorDark: '#0B0B0B', android12: true },
    autoColors: false,
    fonts: { family: '', files: [] },
    supportedLocales: ['en', 'ar'],
    minSdk: 21,
    platforms: ['android', 'ios'],
    androidSigning: false,
    supportEmail: '',
    privacyUrl: '',
    termsUrl: '',
  },
  setup: { mapsApiKey: '', syncfusionLicense: '', sentryDsn: '', recaptchaSiteKey: '' },
};

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const clone = (v) => (v === null || typeof v !== 'object' ? v : JSON.parse(JSON.stringify(v)));

// Deep-merge `over` onto `base` with light coercion by the base value's type.
// Empty-object bases are treated as free maps (per-flavor records) — pass through.
function merge(base, over) {
  if (over === undefined || over === null) return clone(base);
  if (Array.isArray(base)) return Array.isArray(over) ? clone(over) : clone(base);
  if (isObj(base)) {
    if (!isObj(over)) return clone(base);
    if (Object.keys(base).length === 0) return clone(over); // free map (e.g. baseUrlByFlavor)
    const out = {};
    for (const k of Object.keys(base)) out[k] = merge(base[k], over[k]);
    return out;
  }
  if (typeof base === 'boolean') return typeof over === 'boolean' ? over : over === 'true' ? true : over === 'false' ? false : !!over;
  if (typeof base === 'number') { const n = Number(over); return Number.isFinite(n) ? n : base; }
  return String(over);
}

// parseConfig — deep-merge caller input over defaultConfig (the ex-zod parse).
function parseConfig(input) {
  return merge(defaultConfig, input && typeof input === 'object' ? input : {});
}

const isStructured = (c) => c.mode === 'structured-getx' || c.mode === 'structured-riverpod';

// Self-check: parse-with-defaults on {} must reproduce the canonical config, and
// coercion must normalize a few off-type values.
function demo() {
  const assert = require('assert');
  assert.deepStrictEqual(parseConfig({}), defaultConfig, 'parseConfig({}) must equal defaultConfig');
  assert.strictEqual(parseConfig({ testing: 'false' }).testing, false, 'boolean coercion');
  assert.strictEqual(parseConfig({ identity: { minSdk: '24' } }).identity.minSdk, 24, 'number coercion');
  assert.deepStrictEqual(parseConfig({ themes: ['light'] }).themes, ['light'], 'array replace');
  assert.deepStrictEqual(parseConfig({ identity: { baseUrlByFlavor: { dev: 'x' } } }).identity.baseUrlByFlavor, { dev: 'x' }, 'free map merge');
  assert.strictEqual(parseConfig({}).identity.brandColor, '#1E5AF6', 'nested default preserved');
  return true;
}

module.exports = {
  LAUNCHPAD_MODES, STATE_MGMTS, ARCHITECTURES, NAVIGATIONS, API_CLIENTS, LOCALIZATIONS, MODELS_CODEGEN,
  defaultConfig, parseConfig, isStructured, demo,
};
