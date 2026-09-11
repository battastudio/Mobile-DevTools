'use strict';

const { f } = require('./helpers');

// Nav shell (bottom-nav + IndexedStack), auth guard helper, and a GDPR consent
// gate + iOS ATT flow. Widgets are reusable (caller supplies pages) so they stay
// mode-agnostic; storage access is sync (GetX) vs async (riverpod/generic).

const widgetsDir = (config) => (config.mode === 'generic' ? 'lib/widgets' : 'lib/components');
const importHead = (app, config) =>
  config.mode === 'generic'
    ? `import 'package:flutter/material.dart';\nimport 'package:${app}/utils/app_keys.dart';\nimport 'package:${app}/utils/local_storage.dart';`
    : `import 'package:${app}/general_exports.dart';`;
const awaitRead = (config) => (config.mode === 'structured-getx' ? '' : 'await ');

const navShell = (app, config) => `${importHead(app, config)}

// Bottom-navigation shell. Supply the tab pages + items; keeps state per tab via
// IndexedStack. Use it as your home: home: AppNavShell(pages: [...], items: [...]).
class AppNavShell extends StatefulWidget {
  const AppNavShell({super.key, required this.pages, required this.items});

  final List<Widget> pages;
  final List<BottomNavigationBarItem> items;

  @override
  State<AppNavShell> createState() => _AppNavShellState();
}

class _AppNavShellState extends State<AppNavShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _index, children: widget.pages),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        type: BottomNavigationBarType.fixed,
        items: widget.items,
        onTap: (int i) => setState(() => _index = i),
      ),
    );
  }
}
`;

function authGuard(app, config) {
  const path = config.mode === 'generic' ? 'lib/utils/auth_guard.dart' : 'lib/navigation/auth_guard.dart';
  const sync = config.mode === 'structured-getx';
  const body = sync
    ? `bool isAuthenticated() => LocalStorage.read(AppKeys.token) != null;`
    : `Future<bool> isAuthenticated() async => (await LocalStorage.read(AppKeys.token)) != null;`;
  return f(path, `${importHead(app, config)}

// Auth gate. Wire it into the router:
//   GoRouter(redirect: (ctx, state) => isAuthenticated() ? null : routeAuth)  // riverpod/generic
//   GetX: a GetMiddleware.redirect returning RouteSettings(name: routeAuth)   // getx
${body}
`);
}

const consentGate = (app, config) => {
  const att = `import 'package:permission_handler/permission_handler.dart';\n`;
  return `${importHead(app, config)}
${att}
// First-run GDPR consent + iOS App Tracking Transparency. Wrap the app root or
// call from the first screen. Persists the choice so it only shows once.
class ConsentGate extends StatefulWidget {
  const ConsentGate({super.key, required this.child});

  final Widget child;

  @override
  State<ConsentGate> createState() => _ConsentGateState();
}

class _ConsentGateState extends State<ConsentGate> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _maybeAsk());
  }

  Future<void> _maybeAsk() async {
    final String? seen = ${awaitRead(config)}LocalStorage.read(AppKeys.consent);
    if (seen == 'true' || !mounted) return;
    final bool ok = await showDialog<bool>(
          context: context,
          builder: (BuildContext ctx) => AlertDialog(
            title: const Text('Privacy'),
            content: const Text('We use analytics to improve the app. Do you consent?'),
            actions: <Widget>[
              TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
              FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes')),
            ],
          ),
        ) ??
        false;
    ${config.mode === 'structured-getx' ? '' : 'await '}LocalStorage.write(AppKeys.consent, ok.toString());
    if (ok) await Permission.appTrackingTransparency.request();
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
`;
};

// navShellFiles — bottom-nav shell + auth guard (when config.navShell).
function navShellFiles(app, config) {
  if (!config.navShell) return [];
  return [f(`${widgetsDir(config)}/app_nav_shell.dart`, navShell(app, config)), authGuard(app, config)];
}

// consentFiles — GDPR consent gate + ATT (when config.consent).
function consentFiles(app, config) {
  if (!config.consent) return [];
  return [f(`${widgetsDir(config)}/consent_gate.dart`, consentGate(app, config))];
}

module.exports = { navShellFiles, consentFiles };
