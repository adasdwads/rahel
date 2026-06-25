const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');
const { spawn } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const dataDir = path.join(rootDir, 'data');
const dbPath = path.join(dataDir, 'rahel.sqlite');
const port = 3100;
const baseUrl = `http://127.0.0.1:${port}/api`;

const env = {
  ...process.env,
  PORT: String(port),
  DATABASE_PATH: dbPath,
  DEAD_MAN_SWITCH_DAYS: '1'
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ensureCleanDatabase = () => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
};

const startServer = async () => {
  const child = spawn(process.execPath, [path.join(srcDir, 'server.js')], {
    cwd: rootDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';

  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });

  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      if (response.ok) {
        return { child, stdoutRef: () => stdout, stderrRef: () => stderr };
      }
    } catch (error) {
      await wait(250);
    }
  }

  child.kill();
  throw new Error(`Server failed to start.\nSTDOUT:\n${stdout}\nSTDERR:\n${stderr}`);
};

const stopServer = async (child) => {
  if (!child || child.killed) {
    return;
  }

  child.kill();
  await wait(500);
};

const request = async (pathname, options = {}) => {
  const headers = { ...(options.headers || {}) };
  let body = options.body;

  if (body && typeof body !== 'string' && !Buffer.isBuffer(body)) {
    body = JSON.stringify(body);
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const response = await fetch(`${baseUrl}${pathname}`, {
    method: options.method || 'GET',
    headers,
    body
  });

  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch (error) {
    json = null;
  }

  return {
    status: response.status,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries()),
    text,
    json
  };
};

const authHeaders = (token) => ({
  Authorization: `Bearer ${token}`
});

const db = () => new Database(dbPath);

const setDeathCertificateVerified = (userID) => {
  const database = db();
  const deathCertificateID = `death-${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  database.prepare(`
    INSERT INTO DeathCertificates (deathCertificateID, userID, certificateNumber, issuedAt, verifiedAt, status, source, timestamp)
    VALUES (?, ?, ?, ?, ?, 'Verified', 'CivilRegistry', ?)
  `).run(
    deathCertificateID,
    userID,
    `CERT-${Date.now()}`,
    now,
    now,
    now
  );

  database.close();
  return deathCertificateID;
};

const setHeartbeatLastHeartbeat = (userID, isoDate, escalationStatus = 'Healthy') => {
  const database = db();
  database.prepare(`
    UPDATE HeartbeatConfigs
    SET lastHeartbeatAt = ?, escalationStatus = ?, updatedAt = ?
    WHERE userID = ?
  `).run(isoDate, escalationStatus, new Date().toISOString(), userID);
  database.close();
};

const getUserStatus = (userID) => {
  const database = db();
  const row = database.prepare('SELECT status FROM Users WHERE userID = ?').get(userID);
  database.close();
  return row;
};

const getKeyShards = (fileID) => {
  const database = db();
  const rows = database.prepare('SELECT * FROM KeyShards WHERE fileID = ? ORDER BY shardIndex ASC').all(fileID);
  database.close();
  return rows.map((row) => ({
    ...row,
    shardData: Buffer.from(row.shardData).toString('base64')
  }));
};

const getVaultRecord = (fileID) => {
  const database = db();
  const row = database.prepare('SELECT * FROM SecureVault WHERE fileID = ?').get(fileID);
  database.close();
  return row;
};

const getAuditLogs = (userID) => {
  const database = db();
  const rows = database.prepare('SELECT * FROM AuditLogs WHERE userID = ? ORDER BY timestamp DESC').all(userID);
  database.close();
  return rows;
};

const main = async () => {
  ensureCleanDatabase();

  const { decrypt } = require(path.join(srcDir, 'crypto', 'encryptionEngine'));
  const { reconstructKey } = require(path.join(srcDir, 'crypto', 'keySharding'));
  const { checkUserHeartbeat } = require(path.join(srcDir, 'automation', 'deadManSwitch'));

  const results = {
    endpoints: {},
    flows: {},
    crypto: {},
    server: {},
    issues: []
  };

  let server;

  try {
    server = await startServer();

    results.endpoints.health = await request('/health');

    const registerPayload = {
      name: 'Integration User',
      email: `integration-${Date.now()}@example.com`,
      phone: '+971500000001',
      password: 'Password123!',
      biometricToken: 'bio-token'
    };

    results.endpoints.register = await request('/auth/register', {
      method: 'POST',
      body: registerPayload
    });

    results.endpoints.login = await request('/auth/login', {
      method: 'POST',
      body: {
        email: registerPayload.email,
        password: registerPayload.password
      }
    });

    const token = results.endpoints.login.json.accessToken;
    const userID = results.endpoints.login.json.user.userID;

    results.endpoints.users = await request('/users', {
      headers: authHeaders(token)
    });

    const heirOne = await request('/inheritance-access', {
      method: 'POST',
      headers: authHeaders(token),
      body: {
        recipientName: 'Heir One',
        phone: '+971500000002',
        email: 'heir1@example.com',
        accessTier: 'Full',
        relationshipType: 'Son',
        isVerified: true
      }
    });

    const heirTwo = await request('/inheritance-access', {
      method: 'POST',
      headers: authHeaders(token),
      body: {
        recipientName: 'Heir Two',
        phone: '+971500000003',
        email: 'heir2@example.com',
        accessTier: 'Financial',
        relationshipType: 'Daughter',
        isVerified: true
      }
    });

    const vaultPlaintext = Buffer.from('RAHEL integration secret file', 'utf8');
    results.endpoints.secureVault = await request('/secure-vault', {
      method: 'POST',
      headers: authHeaders(token),
      body: {
        fileName: 'vault.txt',
        fileType: 'text/plain',
        fileSize: vaultPlaintext.length,
        encryptedDataBLOB: vaultPlaintext.toString('base64'),
        heirRecipientIDs: [heirOne.json.recipientID, heirTwo.json.recipientID],
        threshold: 2
      }
    });

    await request('/wallet/fund', {
      method: 'POST',
      headers: authHeaders(token),
      body: {
        amount: 1000,
        fundingSource: 'integration-test'
      }
    });

    results.endpoints.charityFlows = await request('/charity-flows', {
      method: 'POST',
      headers: authHeaders(token),
      body: {
        charityName: 'Integration Charity',
        recurringAmount: 250,
        currency: 'AED',
        bankWalletToken: 'wallet-token-int',
        charityAPI_Endpoint: 'https://charity.example/api',
        projectType: 'General',
        isActive: true
      }
    });

    const capsuleContent = Buffer.from('Deliver after trigger', 'utf8');
    results.endpoints.timeCapsules = await request('/time-capsules', {
      method: 'POST',
      headers: authHeaders(token),
      body: {
        title: 'Integration Capsule',
        contentBLOB: capsuleContent.toString('base64'),
        contentType: 'Text',
        targetReleaseDate: new Date(Date.now() + 86400000).toISOString(),
        recipientContact: 'capsule@example.com',
        recipientName: 'Capsule Recipient',
        deliveryMethod: 'Email'
      }
    });

    results.endpoints.heartbeatStatus = await request('/heartbeat/status', {
      headers: authHeaders(token)
    });

    results.endpoints.walletBalance = await request('/wallet/balance', {
      headers: authHeaders(token)
    });

    const deathCertificateID = setDeathCertificateVerified(userID);
    const webhookPayload = JSON.stringify({ deathCertificateID, userID });
    const signature = crypto
      .createHmac('sha256', env.CIVIL_REGISTRY_WEBHOOK_SECRET || 'rahel-civil-registry-webhook-secret')
      .update(webhookPayload)
      .digest('hex');

    results.endpoints.webhook = await request('/webhooks/civil-registry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-rahel-signature': signature
      },
      body: webhookPayload
    });

    results.endpoints.auditLogs = await request('/audit-logs', {
      headers: authHeaders(token)
    });

    results.flows.deathTrigger = {
      userStatus: getUserStatus(userID),
      webhookResult: results.endpoints.webhook.json,
      auditActions: getAuditLogs(userID).map((log) => log.action)
    };

    results.endpoints.heartbeatConfigUpdate = await request('/heartbeat/config', {
      method: 'PUT',
      headers: authHeaders(token),
      body: {
        intervalDays: 1,
        notificationChannel: 'Email',
        contactTarget: 'integration@example.com'
      }
    });

    results.endpoints.heartbeatPing = await request('/heartbeat/ping', {
      method: 'POST',
      headers: authHeaders(token)
    });

    const staleDate = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)).toISOString();
    setHeartbeatLastHeartbeat(userID, staleDate, 'Healthy');
    results.flows.deadManSwitchPing = checkUserHeartbeat(userID);
    results.flows.deadManSwitchEscalation = checkUserHeartbeat(userID);

    const vaultRecord = getVaultRecord(results.endpoints.secureVault.json.fileID);
    const encryptedPayload = JSON.parse(Buffer.from(vaultRecord.encryptedDataBLOB).toString('utf8'));
    const shards = getKeyShards(results.endpoints.secureVault.json.fileID);
    const reconstructedKey = reconstructKey(shards.slice(0, 2));
    const decrypted = decrypt(encryptedPayload, reconstructedKey);

    results.crypto = {
      shardCount: shards.length,
      reconstructedKeyLength: reconstructedKey.length,
      decryptedMatches: decrypted.equals(vaultPlaintext),
      decryptedText: decrypted.toString('utf8')
    };

    results.server = {
      stdout: server.stdoutRef(),
      stderr: server.stderrRef()
    };

    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error(JSON.stringify({
      error: error.message,
      stack: error.stack,
      partialResults: results
    }, null, 2));
    process.exitCode = 1;
  } finally {
    await stopServer(server && server.child);
  }
};

main();