'use strict';
// Device Lab routes — connect to a booted device/emulator and check the real app: list, app info,
// screenshot/record, live logs, install & launch, automated smoke, and artifact serve/delete.
// Controllers only: resolve the device, call the device layer, stream or shape the response.
const fs = require('fs');
const path = require('path');
const device = require('../device');

module.exports = function registerDeviceRoutes(app) {
  const { r, sse, sendJson } = app;
  const resolveDev = (deviceId) => device.findDevice(deviceId);

  r('GET', '/api/qa/device/list', ({ res }) => device.listDevices()
    .then((d) => sendJson(res, 200, { devices: d.filter((x) => ['android', 'ios-sim', 'ios-device'].includes(x.platform)) }))
    .catch((e) => sendJson(res, 200, { devices: [], error: e.message })));
  r('POST', '/api/qa/device/appinfo', ({ res, body }) => resolveDev(body.device).then((dev) => dev ? device.appInfo(dev, body.path).then((x) => sendJson(res, 200, x)) : sendJson(res, 400, { error: 'device not found (still booted?)' })), { body: true });
  r('POST', '/api/qa/device/screenshot', ({ res, body }) => resolveDev(body.device).then((dev) => dev ? device.screenshot(dev, body.path).then((x) => sendJson(res, 200, x)).catch((e) => sendJson(res, 200, { ok: false, error: e.message })) : sendJson(res, 400, { error: 'device not found' })), { body: true });
  r('POST', '/api/qa/device/record/start', ({ res, body }) => resolveDev(body.device).then((dev) => dev ? device.recordStart(dev, body.path).then((x) => sendJson(res, 200, x)) : sendJson(res, 400, { error: 'device not found' })), { body: true });
  r('POST', '/api/qa/device/record/stop', ({ res, body }) => resolveDev(body.device).then((dev) => dev ? device.recordStop(dev, body.path).then((x) => sendJson(res, 200, x)) : sendJson(res, 400, { error: 'device not found' })), { body: true });

  r('POST', '/api/qa/device/logs', ({ req, res, body }) => {
    const send = sse(res);
    resolveDev(body.device).then((dev) => {
      if (!dev) { send('error', { message: 'device not found' }); return res.end(); }
      const appId = dev.platform === 'android' ? device.androidPackageId(body.path) : device.iosBundleId(body.path);
      const stream = device.logStream(dev, appId, ({ line, crash }) => send('log', { line, crash }));
      req.on('close', () => { try { if (stream.child) process.kill(-stream.child.pid, 'SIGKILL'); } catch { try { stream.child && stream.child.kill('SIGKILL'); } catch {} } });
      stream.promise.then(() => { try { send('done', { ok: true }); res.end(); } catch {} });
    });
  }, { body: true });
  r('POST', '/api/qa/device/install-launch', ({ req, res, body }) => {
    const send = sse(res); const onLine = (l) => send('log', { line: l });
    req.on('close', () => device.stopAll());   // Stop / navigate away kills the build tree
    resolveDev(body.device).then((dev) => {
      if (!dev) { send('error', { message: 'device not found' }); return res.end(); }
      device.installLaunch(dev, body.path, onLine, {}).then((x) => { send('result', x); send('done', { ok: true }); res.end(); }).catch((e) => { send('error', { message: e.message }); res.end(); });
    });
  }, { body: true });
  r('POST', '/api/qa/device/smoke', ({ req, res, body }) => {
    const send = sse(res); const onLine = (l) => send('log', { line: l });
    req.on('close', () => device.stopAll());
    resolveDev(body.device).then((dev) => {
      if (!dev) { send('error', { message: 'device not found' }); return res.end(); }
      device.smoke(dev, body.path, onLine, { events: body.events }).then((x) => { send('result', x); send('done', { ok: true }); res.end(); }).catch((e) => { send('error', { message: e.message }); res.end(); });
    });
  }, { body: true });
  r('POST', '/api/qa/device/stop', ({ res }) => sendJson(res, 200, device.stopAll()));

  r('GET', '/api/qa/artifacts', ({ res, q }) => sendJson(res, 200, { artifacts: device.listArtifacts(q.get('path') || '') }));
  r('GET', '/api/qa/artifact', ({ res, q }) => {
    const abs = device.safeArtifact(q.get('path') || '');
    if (!abs) { res.writeHead(fs.existsSync(path.resolve(q.get('path') || '')) ? 403 : 404); return res.end(abs === null ? 'forbidden or not found' : 'not found'); }
    res.writeHead(200, { 'Content-Type': device.mimeOf(abs), 'Cache-Control': 'no-cache' }); fs.createReadStream(abs).pipe(res);
  });
  r('POST', '/api/qa/artifact/delete', ({ res, body }) => {
    let removed = 0; for (const p of (body.paths || [])) { const abs = device.safeArtifact(p); if (abs) { try { fs.unlinkSync(abs); removed++; } catch {} } }
    sendJson(res, 200, { ok: true, removed });
  }, { body: true });
};
