'use strict';
// AGENTS.md — the per-task loop, definition-of-done, and allowed commands an agent
// runs in this repo. Kept lean; CLAUDE.md holds the architecture rules.
const { isStructured } = require('../schema');
const { resolveRules } = require('../rules');

function agentsMd(config) {
  const structured = isStructured(config);
  const rules = resolveRules(config);
  const rulesBlock = rules.length ? ['', '## Project rules (MUST follow)', ...rules.map((r) => `- ${r}`)] : [];
  return [
    `# AGENTS.md — ${config.appName}`,
    '',
    'Read **CLAUDE.md** first — it defines the architecture. This file is the workflow.',
    '',
    '## Per-task loop',
    '1. Restate the task and the exact files it will touch.',
    '2. Read the feature folder + its `index.dart` barrel before editing.',
    '3. Make the change by hand (no generators). Keep each file ≤150 lines.',
    '4. Wire new files into their subtree barrel and the router.',
    '5. Run the allowed commands below until clean, then write/update the feature doc + test.',
    '',
    '## Definition of done',
    '- [ ] `flutter analyze` reports no issues.',
    '- [ ] `flutter test` passes.',
    ...(structured
      ? [
          '- [ ] Every touched file imports only `general_exports.dart` and is added to its barrel.',
          '- [ ] Networking goes through `ApiRequest`; keys come from `AppKeys` (no raw strings).',
          '- [ ] Every file is ≤150 lines.',
          '- [ ] Feature has a doc under `docs/features/` and a test under `test/`.',
        ]
      : ['- [ ] Files are small and single-purpose.']),
    '- [ ] Missing assets were requested, not guessed.',
    ...rulesBlock,
    '',
    '## Allowed commands',
    '```sh',
    'flutter pub get',
    'flutter analyze',
    'flutter test',
    'dart format .',
    ...(config.localization !== 'none' && config.mode !== 'structured-getx' ? ['flutter gen-l10n'] : []),
    ...(config.modelsCodegen === 'freezed' && config.models.length ? ['dart run build_runner build --delete-conflicting-outputs'] : []),
    ...(config.firebase.length ? ['dart pub global activate flutterfire_cli', 'flutterfire configure'] : []),
    ...(config.assets.includes('launcher_icons') ? ['dart run flutter_launcher_icons'] : []),
    ...(config.assets.includes('native_splash') ? ['dart run flutter_native_splash:create'] : []),
    ...(config.nativeFlavors && config.flavors.length ? config.flavors.map((fl) => `flutter run --flavor ${fl} -t lib/main_${fl}.dart`) : []),
    '```',
    '',
    '## Never',
    '- Add a pub dependency without asking (keep the stack minimal).',
    ...(structured ? ['- Run codegen/build_runner (structured modes are codegen-free), or import anything but `general_exports.dart`.'] : []),
    '- Hardcode strings/colors/sizes (define once in l10n/theme tokens, reference everywhere), swallow errors, or leave TODOs in shipped code.',
    '- Use single-character or cryptic identifiers — names must reveal intent.',
    '- Exceed 150 lines in a file, or skip a feature\'s doc + test.',
    '',
  ].join('\n');
}

module.exports = { agentsMd };
