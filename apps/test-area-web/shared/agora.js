// Thin wrapper around Agora's web SDK so each page doesn't reinvent the loader
// + lifecycle plumbing. Loaded as an ES module from the test-area pages.
//
// SDK is pulled from CDN at use time so we don't ship a bundle. Pinned to a
// specific minor version — bump when intentionally upgrading.

const AGORA_SDK_URL = 'https://download.agora.io/sdk/release/AgoraRTC_N-4.20.0.js';

let sdkLoadPromise = null;

export const loadAgoraSdk = () => {
  if (sdkLoadPromise) return sdkLoadPromise;
  sdkLoadPromise = new Promise((resolve, reject) => {
    if (window.AgoraRTC) {
      resolve(window.AgoraRTC);
      return;
    }
    const script = document.createElement('script');
    script.src = AGORA_SDK_URL;
    script.async = true;
    script.onload = () => {
      if (window.AgoraRTC) resolve(window.AgoraRTC);
      else reject(new Error('Agora SDK loaded but window.AgoraRTC is missing'));
    };
    script.onerror = () => reject(new Error(`Failed to load Agora SDK from ${AGORA_SDK_URL}`));
    document.head.appendChild(script);
  });
  return sdkLoadPromise;
};

// Tiny in-page event log. Pages bind this to a <pre id="log"> for visibility
// into every SDK callback. Helps when debugging "why isn't audio coming
// through" — you see exactly what the SDK fired.
export const createLog = (mountId) => {
  const el = typeof mountId === 'string' ? document.getElementById(mountId) : mountId;
  const lines = [];
  return {
    push(level, msg, extra) {
      const ts = new Date().toISOString().slice(11, 19);
      const line =
        `[${ts}] ${level.padEnd(5)} ${msg}` + (extra !== undefined ? ` · ${JSON.stringify(extra)}` : '');
      lines.push(line);
      console.log(line);
      if (el) el.textContent = lines.slice(-200).join('\n');
    },
    info: function (m, e) { this.push('INFO', m, e); },
    warn: function (m, e) { this.push('WARN', m, e); },
    error: function (m, e) { this.push('ERROR', m, e); },
  };
};

// One-stop helper: load SDK, create client, join channel, publish local
// audio (and optionally video). Returns { client, localAudio, localVideo,
// leave }. Caller is responsible for rendering remote users via the
// 'user-published' event.
export const createCallSession = async (opts) => {
  const { mode = 'rtc', appId, channelName, uid, token, withVideo, log } = opts;
  if (!appId) throw new Error('createCallSession: appId required');
  if (!channelName) throw new Error('createCallSession: channelName required');
  if (!token) throw new Error('createCallSession: token required');
  console.log('here 1')
  const AgoraRTC = await loadAgoraSdk();
  console.log('here 2')
  AgoraRTC.setLogLevel(1); // 0 DEBUG, 1 INFO, 2 WARN, 3 ERROR, 4 NONE
  log?.info('Agora join options', opts);
  log?.info('SDK loaded', { version: AgoraRTC.VERSION });

  const client = AgoraRTC.createClient({ mode, codec: 'vp8' });

  // Surface SDK lifecycle events in the page log.
  client.on('connection-state-change', (cur, prev, reason) => {
    log?.info(`connection ${prev} → ${cur}`, { reason });
  });
  client.on('token-privilege-will-expire', () => {
    log?.warn('token privilege will expire in 30s — renew');
  });
  client.on('token-privilege-did-expire', () => {
    log?.error('token expired — auto-disconnect imminent');
  });
  client.on('user-joined', (user) => log?.info('remote user-joined', { uid: user.uid }));
  client.on('user-left', (user, reason) => log?.info('remote user-left', { uid: user.uid, reason }));

  // Log the exact App ID bytes the SDK is about to use. If Agora rejects with
  // "invalid vendor key, can not find appid", the value here is what they
  // looked up — copy it 1:1 into the Agora dashboard search to confirm the
  // project exists and matches the certificate that signed the token.
  log?.info('about to join', {
    appId,
    appIdLength: appId.length,
    appIdShape: /^[0-9a-f]{32}$/.test(appId) ? 'OK (32-hex)' : 'BAD (not 32-hex)',
    channelName,
    uid,
    tokenPrefix: token.slice(0, 8),
  });

  await client.join(appId, channelName, token, uid);
  log?.info('joined channel', { channelName, uid });

  const localAudio = await AgoraRTC.createMicrophoneAudioTrack();
  const tracks = [localAudio];
  let localVideo = null;
  if (withVideo) {
    localVideo = await AgoraRTC.createCameraVideoTrack();
    tracks.push(localVideo);
  }
  await client.publish(tracks);
  log?.info('published local tracks', { audio: true, video: !!withVideo });

  return {
    client,
    localAudio,
    localVideo,
    async leave() {
      try { localAudio?.close(); } catch {}
      try { localVideo?.close(); } catch {}
      try { await client.leave(); } catch (err) { log?.warn('client.leave threw', { err: String(err) }); }
      log?.info('left channel');
    },
  };
};

// Subscribe to a remote user's published track. Pages wire this to the
// 'user-published' event so audio plays automatically and video lands in
// the supplied container. Container is optional for audio-only.
export const subscribeRemote = async (client, user, mediaType, videoContainer, log) => {
  await client.subscribe(user, mediaType);
  log?.info('subscribed remote', { uid: user.uid, mediaType });
  if (mediaType === 'audio') {
    user.audioTrack?.play();
  } else if (mediaType === 'video' && videoContainer) {
    user.videoTrack?.play(videoContainer);
  }
};

export const formatUid = (uid) => `${uid}`;
