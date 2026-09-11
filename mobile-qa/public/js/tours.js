// [split from app.js] Guided tour step defs + startQaTour.
const QA_TOUR_DASH = [
  { sel: '#runall', title: 'Run QA', body: 'Run every test type across all projects, or pick one project to run individual test types.' },
  { sel: '#qaresults', title: 'Projects & grades', body: 'Each project gets a QA grade A–F from tests, coverage, analysis and lint. Click a project to open its test types and testing guide.' },
  { sel: '#qahelp', title: 'Help & tour', body: 'Reopen this guided tour anytime — it adapts to whichever screen you’re on.' },
  { sel: '#qasettings', title: 'AI settings', body: 'Add your AI provider + key here to unlock the AI QA features. The key stays local and is never sent to the browser.' },
];
const QA_TOUR_DETAIL = [
  { sel: '#qa-grade', title: 'Project grade', body: 'The A–F score for this project with failing / pass counts and when it last ran. The sparkline shows the trend.' },
  { sel: '#tb-runall', title: 'Run the suite', body: 'Run every test type for this project, or select chips below and use Run selected.' },
  { sel: '.qa-autofix', title: 'Auto-fix', body: 'Apply safe formatters (dart format / pint / prettier), then re-run — a quick way to clear formatting failures.' },
  { sel: '.ai-plan', title: 'AI QA', body: 'With an AI key set: draft a prioritized test plan, write Gherkin scenarios, generate a smoke test, get a readiness summary, or list untested files.' },
  { sel: '#qadevice', title: 'Device for integration', body: 'Integration & golden tests run on the device you pick here (Detect rescans); everything else runs headless.' },
  { sel: '#qa-suite', title: 'Pick test types', body: 'Click a chip to select it. Selected types run together and expand into detail panels below.' },
  { sel: '#qa-details', title: 'Details, scaffolds & fixes', body: 'Selected types expand here with results, one-click scaffolds, and one-click / AI fixes for failures.' },
  { sel: '#detaillog', title: 'Live log', body: 'Each stage streams here as the suite runs — expand a step to read its output.' },
  { sel: '#dback', title: 'Back', body: 'Return to all projects and grades whenever you like.' },
];
const QA_TOUR_LAB = [
  { sel: '#dlproj', title: 'Pick an app', body: 'Choose which project to install on a device. Captured screenshots and recordings are grouped per app.' },
  { sel: '#dldevice', title: 'Pick a device', body: 'Booted simulators / emulators and connected Android devices. Hit Refresh after booting a new one.' },
  { sel: '#dl-install', title: 'Install & Launch', body: 'Build, install and launch the app on the selected device.' },
  { sel: '#dl-shot', title: 'Screenshot', body: 'Grab the current screen — it lands in the artifacts gallery below to view and share.' },
  { sel: '#dl-rec', title: 'Record', body: 'Screen-record a session; click again (or Stop) to save the video as an artifact.' },
  { sel: '#dl-logs', title: 'Live logs', body: 'Stream the device console in real time, with crashes and ANRs highlighted.' },
  { sel: '#dl-smoke', title: 'Smoke / stress', body: 'Fire the set number of random events at the app to shake out crashes; AI triage reads the resulting log.' },
  { sel: '#dl-triage', title: 'AI triage', body: 'With an AI key set, triage the console output for crashes and get a likely root cause + fix.' },
];
function startQaTour() {
  const steps = QA.detailPath ? QA_TOUR_DETAIL : QA.view === 'device' ? QA_TOUR_LAB : QA_TOUR_DASH;
  startTour(steps, 'qaTourSeen');
}
