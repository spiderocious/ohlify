// QA harness — capture a screenshot of the page agent-browser is driving.
//
// `agent-browser screenshot` fails in this environment with
// "Resource temporarily unavailable (os error 35)" while every other command
// works, so we talk to Chrome over CDP ourselves. Same picture, one dependency
// (`ws`, already in the workspace).
//
// CLI: node tools/qa/shot.mjs <output.png> [cdpBrowserWsUrl]
//   The CDP URL defaults to `agent-browser get cdp-url`.
import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const WebSocket = require('ws');

const out = process.argv[2];
if (!out) {
  console.error('usage: node tools/qa/shot.mjs <output.png> [cdpUrl]');
  process.exit(1);
}

const browserWs =
  process.argv[3] ?? execSync('agent-browser get cdp-url').toString().trim().split('\n').pop();

/** One request/response round trip on a CDP socket. */
const send = (ws, id, method, params = {}, sessionId) =>
  new Promise((resolve, reject) => {
    const onMessage = (raw) => {
      const msg = JSON.parse(raw.toString());
      if (msg.id !== id) return;
      ws.off('message', onMessage);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    };
    ws.on('message', onMessage);
    ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    setTimeout(() => reject(new Error(`CDP timeout on ${method}`)), 20_000);
  });

const ws = new WebSocket(browserWs, { maxPayload: 256 * 1024 * 1024 });

ws.on('open', async () => {
  try {
    // The browser-level socket cannot screenshot; attach to the visible page first.
    const { targetInfos } = await send(ws, 1, 'Target.getTargets');
    // Chrome keeps a `chrome://newtab/` page target alive alongside the real
    // one, and capturing it hangs forever rather than erroring. Prefer an
    // http(s) target — that is the page agent-browser is actually driving.
    const pages = targetInfos.filter((t) => t.type === 'page');
    const page =
      pages.find((t) => /^https?:\/\//.test(t.url)) ??
      pages.find((t) => !t.url.startsWith('chrome://') && !t.url.startsWith('devtools://'));
    if (!page) throw new Error(`no usable page target (saw: ${pages.map((p) => p.url).join(', ')})`);

    const { sessionId } = await send(ws, 2, 'Target.attachToTarget', {
      targetId: page.targetId,
      flatten: true,
    });

    await send(ws, 3, 'Target.activateTarget', { targetId: page.targetId });
    await send(ws, 4, 'Page.enable', {}, sessionId).catch(() => {});

    // `Page.captureScreenshot` hangs indefinitely against this headless
    // instance — it waits on a compositor frame that never arrives. Screencast
    // is push-based: Chrome hands us the next frame it paints, so we start it,
    // take frame one, and stop. Same pixels, and it actually returns.
    const data = await new Promise((resolve, reject) => {
      const onFrame = (raw) => {
        const msg = JSON.parse(raw.toString());
        if (msg.method !== 'Page.screencastFrame') return;
        ws.off('message', onFrame);
        // Ack so Chrome stops resending, then shut the cast down.
        ws.send(
          JSON.stringify({
            id: 98,
            method: 'Page.screencastFrameAck',
            params: { sessionId: msg.params.sessionId },
            sessionId,
          }),
        );
        ws.send(JSON.stringify({ id: 99, method: 'Page.stopScreencast', params: {}, sessionId }));
        resolve(msg.params.data);
      };
      ws.on('message', onFrame);
      ws.send(
        JSON.stringify({
          id: 5,
          method: 'Page.startScreencast',
          params: { format: 'png', everyNthFrame: 1 },
          sessionId,
        }),
      );
      setTimeout(() => {
        ws.off('message', onFrame);
        reject(new Error('no screencast frame within 15s'));
      }, 15_000);
    });
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, Buffer.from(data, 'base64'));
    console.log(`saved ${out} (${page.url})`);
    ws.close();
    process.exit(0);
  } catch (err) {
    console.error('shot failed:', err.message);
    ws.close();
    process.exit(1);
  }
});

ws.on('error', (err) => {
  console.error('cdp socket error:', err.message);
  process.exit(1);
});
