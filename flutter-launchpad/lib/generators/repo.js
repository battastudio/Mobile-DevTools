'use strict';
// Repo hygiene + DX files emitted for every project: README, .gitignore,
// .editorconfig, VS Code launch configs, and a format+analyze pre-commit hook.
const f = (path, content) => ({ path, content: content.replace(/\n?$/, '\n') });

function readme(config) {
  const runLine = config.nativeFlavors && config.flavors.length
    ? config.flavors.map((fl) => `flutter run --flavor ${fl} -t lib/main_${fl}.dart`).join('\n')
    : 'flutter run';
  const docs = [
    '- `CLAUDE.md` / `AGENTS.md` — architecture + rules for AI/dev.',
    '- `SETUP.md` — bring-up checklist.',
    '- `PACKAGES.md` — dependency rationale.',
    ...(config.firebase.length ? ['- `FIREBASE.md` — Firebase config + APNs.'] : []),
    ...(config.nativeFlavors ? ['- `FLAVORS.md` — native flavor setup.'] : []),
    ...(config.security.includes('cert_pinning') ? ['- `SECURITY.md` — hardening checklist.'] : []),
    '- `docs/features/` — one doc per feature.',
  ].join('\n');
  return `# ${config.appName}

${config.appName} — scaffolded by Mobile DevTools Flutter Launchpad (${config.mode}).

## Getting started
\`\`\`sh
flutter pub get
${config.localization !== 'none' && config.mode !== 'structured-getx' ? 'flutter gen-l10n\n' : ''}${runLine}
\`\`\`

## Environments
${config.flavors.length ? `Flavors: ${config.flavors.join(', ')} — switch via \`currentMode\` in \`lib/constants/general_constants.dart\`.` : 'Single environment.'}

## Quality
\`\`\`sh
dart format .
flutter analyze
flutter test
\`\`\`
Enable the pre-commit hook: \`git config core.hooksPath .githooks\`.

## Docs
${docs}
`;
}

const GITIGNORE = `# Flutter / Dart
.dart_tool/
.packages
build/
.flutter-plugins
.flutter-plugins-dependencies
pubspec.lock
*.g.dart.lock

# IDE
.idea/
*.iml
.vscode/*
!.vscode/launch.json

# Env & secrets
.env
*.keystore
key.properties
ios/Runner/GoogleService-Info.plist
android/app/google-services.json

# OS
.DS_Store
`;

const EDITORCONFIG = `root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true

[*.dart]
indent_style = space
indent_size = 2
max_line_length = 120
`;

function launchJson(config) {
  const configs =
    config.nativeFlavors && config.flavors.length
      ? config.flavors.map((fl) => ({ name: fl, request: 'launch', type: 'dart', program: `lib/main_${fl}.dart`, args: ['--flavor', fl] }))
      : [{ name: config.appName, request: 'launch', type: 'dart', program: 'lib/main.dart' }];
  return JSON.stringify({ version: '0.2.0', configurations: configs }, null, 2);
}

const PRECOMMIT = `#!/bin/sh
# Pre-commit: format + analyze. Enable once: git config core.hooksPath .githooks
set -e
dart format --set-exit-if-changed .
flutter analyze
`;

function ciWorkflow(config) {
  const genL10n = config.localization !== 'none' && config.mode !== 'structured-getx';
  const testStep = config.testing
    ? ['      - name: Test (with coverage gate)', '        run: sh tool/coverage.sh']
    : ['      - name: Test', '        run: flutter test'];
  return [
    'name: CI',
    '',
    'on:',
    '  push:',
    '    branches: [main]',
    '  pull_request:',
    '',
    'jobs:',
    '  build:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - uses: actions/checkout@v4',
    '      - uses: subosito/flutter-action@v2',
    '        with:',
    '          channel: stable',
    '      - name: Install dependencies',
    '        run: flutter pub get',
    ...(genL10n ? ['      - name: Generate localizations', '        run: flutter gen-l10n'] : []),
    '      - name: Format check',
    '        run: dart format --set-exit-if-changed .',
    '      - name: Analyze',
    '        run: flutter analyze',
    ...testStep,
    '',
  ].join('\n');
}

function repoFiles(config) {
  return [
    f('README.md', readme(config)),
    f('.gitignore', GITIGNORE),
    f('.editorconfig', EDITORCONFIG),
    f('.vscode/launch.json', launchJson(config)),
    f('.githooks/pre-commit', PRECOMMIT),
    f('.github/workflows/ci.yml', ciWorkflow(config)),
  ];
}

module.exports = { repoFiles };
