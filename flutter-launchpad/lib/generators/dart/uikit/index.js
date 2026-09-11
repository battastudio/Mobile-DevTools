'use strict';

// uikit barrel — UX kit: state widgets + switchers (components/widgets dir),
// form validators (utils), and design tokens (theme). Gated on `components` chips.

const { f } = require('../helpers');
const { stateWidgets, spacing, textStyles } = require('./widgets');
const { validators } = require('./validators');
const { switchers } = require('./switchers');

const widgetsDir = (mode) => (mode === 'generic' ? 'lib/widgets' : 'lib/components');

// uiKit component widgets (state widgets + switchers) for the components/widgets dir.
function uiKitComponents(app, config) {
  const mode = config.mode;
  const dir = widgetsDir(mode);
  const out = [];
  if (config.components.includes('state_widgets')) out.push(f(`${dir}/app_states.dart`, stateWidgets()));
  const wantSwitch =
    config.components.includes('switchers') && (config.themes.includes('dark') || config.localization !== 'none');
  if (wantSwitch) out.push(f(`${dir}/settings_switchers.dart`, switchers(app, config, mode)));
  return out;
}

// validators.dart (utils) — null when form_validators not selected.
function validatorsFile(app, config) {
  return config.components.includes('form_validators') ? f('lib/utils/validators.dart', validators(app, config)) : null;
}

// design tokens (theme) — emitted with the UX kit.
function designTokenFiles(config) {
  if (!config.components.includes('state_widgets') && !config.components.includes('switchers')) return [];
  return [f('lib/theme/app_spacing.dart', spacing()), f('lib/theme/app_text_styles.dart', textStyles())];
}

module.exports = { uiKitComponents, validatorsFile, designTokenFiles };
