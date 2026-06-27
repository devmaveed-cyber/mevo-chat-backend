/**
 * End-to-end call_invite test against production Railway API.
 * Verifies socket delivery AND /calls/pending fallback.
 */
const { io } = require('socket.io-client');

const BASE = process.env.API_BASE || 'https://mevo-chat-backend-production.up.railway.app';
const ts = Date.now();

async function api(path, method, body, token) {
  const res = await fetch(`${BASE}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

function connectSocket(token, label) {
  return new Promise((resolve, reject) => {
    const socket = io(BASE, {
      transports: ['websocket', 'polling'],
      auth: { token },
      reconnection: false,
      timeout: 15000,
    });

    const timer = setTimeout(() => {
      socket.disconnect();
      reject(new Error(`${label}: socket connect timeout`));
    }, 15000);

    socket.on('connect', () => {
      clearTimeout(timer);
      console.log(`[${label}] socket connected`, socket.id);
      resolve(socket);
    });

    socket.on('connect_error', (err) => {
      clearTimeout(timer);
      reject(new Error(`${label}: connect_error ${err.message}`));
    });
  });
}

function waitForEvent(socket, event, label, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label}: timeout waiting for ${event}`));
    }, timeoutMs);

    socket.once(event, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}

async function main() {
  const userA = {
    name: `CallerA_${ts}`,
    email: `callera_${ts}@test.mevo`,
    password: 'test123456',
    phone: '1111111111',
  };
  const userB = {
    name: `CallerB_${ts}`,
    email: `callerb_${ts}@test.mevo`,
    password: 'test123456',
    phone: '2222222222',
  };

  console.log('Registering users...');
  const regA = await api('/auth/register', 'POST', userA);
  const regB = await api('/auth/register', 'POST', userB);
  const tokenA = regA.data.token;
  const tokenB = regB.data.token;
  const idA = regA.data.user.id;
  const idB = regB.data.user.id;
  console.log('User A:', idA);
  console.log('User B:', idB);

  console.log('Connecting sockets...');
  const socketA = await connectSocket(tokenA, 'A');
  const socketB = await connectSocket(tokenB, 'B');
  await new Promise((r) => setTimeout(r, 1000));

  console.log('\n--- Test 1: A calls B ---');
  const invitePromiseB = waitForEvent(socketB, 'call_invite', 'B');
  const callAB = await api('/calls/initiate', 'POST', {
    receiverId: idB,
    callType: 'audio',
  }, tokenA);
  console.log('inviteDelivered:', callAB.data.inviteDelivered);

  try {
    const invite = await invitePromiseB;
    console.log('SOCKET PASS:', invite.callId);
  } catch (e) {
    console.log('SOCKET MISS (expected on multi-instance):', e.message);
    const pending = await api('/calls/pending', 'GET', null, tokenB);
    if (pending.data?.length > 0) {
      console.log('PENDING API PASS:', pending.data[0].callId);
    } else {
      console.error('PENDING API FAIL: no ringing calls for B');
      process.exitCode = 1;
    }
  }

  await api('/calls/status', 'PATCH', {
    callId: callAB.data.call._id,
    status: 'cancelled',
  }, tokenA);

  await new Promise((r) => setTimeout(r, 1000));

  console.log('\n--- Test 2: B calls A ---');
  const invitePromiseA = waitForEvent(socketA, 'call_invite', 'A');
  const callBA = await api('/calls/initiate', 'POST', {
    receiverId: idA,
    callType: 'audio',
  }, tokenB);
  console.log('inviteDelivered:', callBA.data.inviteDelivered);

  try {
    const invite = await invitePromiseA;
    console.log('SOCKET PASS:', invite.callId);
  } catch (e) {
    console.log('SOCKET MISS (expected on multi-instance):', e.message);
    const pending = await api('/calls/pending', 'GET', null, tokenA);
    if (pending.data?.length > 0) {
      console.log('PENDING API PASS:', pending.data[0].callId);
    } else {
      console.error('PENDING API FAIL: no ringing calls for A');
      process.exitCode = 1;
    }
  }

  socketA.disconnect();
  socketB.disconnect();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
