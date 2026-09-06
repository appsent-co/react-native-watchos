// Conformance fixture for the watch runtime's `WebSocket` global.
//
//   node scripts/ws-echo-server.js [port]      # default 8099
//
// `src/demos/WebSocketDemo.tsx` drives it from the watch and prints one
// `[WebSocketDemo] PASS/FAIL …` line per check. Every path exists to exercise one
// behaviour the FireflyDB SDK depends on (`@fireflydb/core`'s DomWsConn /
// awaitWsOpen and `@fireflydb/web`'s WebWebSocketDriver):
//
//   /echo        text + binary echo, and it selects the FIRST offered
//                subprotocol — the relay's rule, so offering
//                ['fireflydb', 'bearer.<jwt>'] must come back as 'fireflydb'
//   /noproto     accepts without selecting a subprotocol
//   /headers     selects the first offered subprotocol, then sends ONE binary
//                frame: the JSON of the upgrade request's headers — proves
//                what `new WebSocket(url, protocols, { headers })` put on the
//                wire (the way `@fireflydb/core`'s RNWebSocketDriver carries
//                the bearer token). Binary so DomWsConn.recv() yields it too.
//   /close1013   closes with 1013 + reason (WS_CLOSE_TRY_AGAIN_LATER, the
//                relay's back-off signal → WsCloseError in the SDK)
//   /close       closes with ?code=&reason=&delay= — the parameterised form,
//                for pinning down which codes survive the transport
//   /drop        destroys the TCP socket with no close frame → unclean 1006
//   /reject      refuses the upgrade with 401 → error before open
//
// Over plain HTTP it also serves `GET /` (15 bytes, for the ArrayBuffer
// check) and `POST /log`, which mirrors the demo's transcript into this
// process's stdout.
//
// The simulator shares the Mac's network stack, so the watch reaches this
// at 127.0.0.1. A physical watch needs the Mac's LAN IP (same host the
// bundle came from — the demo derives it from `__RNW_DEV_SERVER`).

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = Number(process.argv[2] ?? 8099);

// `POST /log` (newline-separated body, or `GET /log?line=…`) mirrors the
// probe's transcript into this process's stdout. The demo sends it here as
// well as to `console.log`, so a run is captured even when the watch's
// console pipe back to Metro is not (a restarted Metro, a Release build, a
// physical watch on another port).
const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/log') {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');
      const lines =
        body.length > 0
          ? body.split('\n')
          : [url.searchParams.get('line') ?? ''];
      for (const line of lines) log(`watch | ${line}`);
      res.writeHead(204);
      res.end();
    });
    return;
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ws-echo-server\n');
});

// One server per path so `handleProtocols` / the close behaviour can differ.
// `noServer` + a manual upgrade router is the only way `ws` supports that.
function makeServer(handleProtocols) {
  return new WebSocketServer({ noServer: true, handleProtocols });
}

// RFC 6455 lets the server pick any ONE offered subprotocol. The relay picks
// the echo entry, which is offered first; mirroring that here is what makes
// the `protocol` readback check meaningful.
const firstOffered = (protocols) => {
  const list = Array.from(protocols);
  return list.length > 0 ? list[0] : false;
};

const echoWss = makeServer(firstOffered);
const closeWss = makeServer(firstOffered);
const noProtoWss = makeServer(() => false);
const headersWss = makeServer(firstOffered);
const close1013Wss = makeServer(firstOffered);
const dropWss = makeServer(firstOffered);

echoWss.on('connection', (ws, req) => {
  log(`open   ${req.url} protocol=${JSON.stringify(ws.protocol)}`);
  ws.on('message', (data, isBinary) => {
    // `data` is a Buffer for both frame types; `isBinary` is the opcode.
    log(`echo   ${isBinary ? 'binary' : 'text'} ${data.length}B`);
    ws.send(data, { binary: isBinary });
  });
  ws.on('close', (code, reason) => {
    log(`close  code=${code} reason=${JSON.stringify(String(reason))}`);
  });
  ws.on('error', (err) => log(`error  ${err.message}`));
});

noProtoWss.on('connection', (ws, req) => {
  log(`open   ${req.url} protocol=${JSON.stringify(ws.protocol)}`);
  ws.on('message', (data, isBinary) => ws.send(data, { binary: isBinary }));
});

headersWss.on('connection', (ws, req) => {
  log(
    `open   ${req.url} protocol=${JSON.stringify(ws.protocol)} authorization=${JSON.stringify(req.headers.authorization ?? null)}`
  );
  ws.send(Buffer.from(JSON.stringify(req.headers), 'utf8'), { binary: true });
});

closeWss.on('connection', (ws, req) => {
  const q = new URL(req.url, 'http://localhost').searchParams;
  const code = Number(q.get('code') ?? 1013);
  const reason = q.get('reason') ?? '';
  const delay = Number(q.get('delay') ?? 50);
  log(`open   ${req.url} → closing ${code} in ${delay}ms`);
  setTimeout(() => ws.close(code, reason), delay);
});

close1013Wss.on('connection', (ws, req) => {
  log(`open   ${req.url} → closing 1013`);
  // A tick of slack so the client has finished its open handler and any
  // `awaitWsOpen` continuation before the close frame lands.
  setTimeout(() => ws.close(1013, 'slow down'), 50);
});

dropWss.on('connection', (ws, req) => {
  log(`open   ${req.url} → destroying the TCP socket (no close frame)`);
  setTimeout(() => {
    // No close handshake at all: the client must synthesise 1006 / not clean.
    ws._socket.destroy();
  }, 50);
});

const ROUTES = {
  '/echo': echoWss,
  '/noproto': noProtoWss,
  '/headers': headersWss,
  '/close1013': close1013Wss,
  '/close': closeWss,
  '/drop': dropWss,
};

server.on('upgrade', (req, socket, head) => {
  const path = (req.url ?? '/').split('?')[0];
  if (path === '/reject') {
    log('reject /reject with 401');
    socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  const wss = ROUTES[path];
  if (!wss) {
    log(`reject unknown path ${path}`);
    socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return;
  }
  wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
});

function log(line) {
  process.stdout.write(`[ws-echo] ${line}\n`);
}

server.listen(PORT, () => {
  log(
    `listening on ws://0.0.0.0:${PORT} (paths: ${Object.keys(ROUTES).join(' ')} /reject)`
  );
});
