const { spawn } = require('child_process');

const processes = new Map();

function startProcess({
  id,
  command,
  args = [],
  cwd,
  env = {}
}) {
  if (!id) {
    throw new Error('Process id wajib diisi.');
  }

  if (processes.has(id)) {
    throw new Error(`Process ${id} sudah berjalan.`);
  }

  const child = spawn(command, args, {
    cwd,
    env: {
      PATH: process.env.PATH,
      HOME: cwd,
      NODE_ENV: 'sandbox',
      ...env
    },
    shell: false,
    detached: false
  });

  const info = {
    id,
    pid: child.pid,
    command: [command, ...args].join(' '),
    stdout: '',
    stderr: '',
    exitCode: null,
    startedAt: Date.now()
  };

  child.stdout.on('data', data => {
    info.stdout += data.toString();
  });

  child.stderr.on('data', data => {
    info.stderr += data.toString();
  });

  child.on('close', code => {
    info.exitCode = code;
    info.finishedAt = Date.now();
  });

  child.on('error', error => {
    info.stderr += error.message;
  });

  processes.set(id, {
    child,
    info
  });

  return {
    ok: true,
    id,
    pid: child.pid,
    command: info.command
  };
}

function getProcess(id) {
  const entry = processes.get(id);

  if (!entry) {
    return {
      ok: false,
      error: `Process ${id} tidak ditemukan.`
    };
  }

  const { info } = entry;

  return {
    ok: true,
    id: info.id,
    pid: info.pid,
    command: info.command,
    running:
      info.exitCode === null &&
      !entry.child.killed,
    exitCode: info.exitCode,
    stdout: info.stdout,
    stderr: info.stderr,
    uptimeMs: Date.now() - info.startedAt
  };
}

function stopProcess(id) {
  const entry = processes.get(id);

  if (!entry) {
    return {
      ok: false,
      alreadyStopped: true,
      id,
      error: `Process ${id} tidak ditemukan.`
    };
  }

  const { child, info } = entry;

  // Process sudah selesai secara normal.
  if (
    info.exitCode !== null ||
    child.exitCode !== null
  ) {
    return {
      ok: true,
      alreadyStopped: true,
      id,
      pid: info.pid,
      exitCode: info.exitCode
    };
  }

  if (child.killed) {
    return {
      ok: true,
      alreadyStopped: true,
      id,
      pid: info.pid
    };
  }

  const killed = child.kill('SIGTERM');

  return {
    ok: killed,
    stopped: killed,
    id,
    pid: info.pid
  };
}

async function waitProcess(id, {
  pattern = '',
  timeout = 10000,
  interval = 100
} = {}) {
  const started = Date.now();
  const maxTime = Number(timeout);
  const checkEvery = Number(interval);

  while (Date.now() - started < maxTime) {
    const entry = processes.get(id);

    if (!entry) {
      return {
        ok: false,
        ready: false,
        error: `Process ${id} tidak ditemukan.`
      };
    }

    const { info } = entry;

    const stdout = info.stdout || '';
    const stderr = info.stderr || '';
    const output = `${stdout}\n${stderr}`;

    if (pattern && output.includes(pattern)) {
      return {
        ok: true,
        ready: true,
        id: info.id,
        pid: info.pid,
        pattern,
        stdout,
        stderr,
        uptimeMs: Date.now() - info.startedAt
      };
    }

    // Process selesai sebelum pattern ditemukan
    if (info.exitCode !== null) {
      return {
        ok: false,
        ready: false,
        id: info.id,
        pid: info.pid,
        exitCode: info.exitCode,
        stdout,
        stderr,
        error:
          info.exitCode === 0
            ? `Process selesai sebelum pattern "${pattern}" ditemukan.`
            : `Process berhenti dengan exit code ${info.exitCode}.`
      };
    }

    await new Promise(resolve =>
      setTimeout(resolve, checkEvery)
    );
  }

  const entry = processes.get(id);

  return {
    ok: false,
    ready: false,
    id,
    pid: entry?.info?.pid ?? null,
    timeout: maxTime,
    stdout: entry?.info?.stdout || '',
    stderr: entry?.info?.stderr || '',
    error: `Timeout menunggu process ${id}.`
  };
}

function listProcesses() {
  return [...processes.entries()].map(([id, entry]) => ({
    id,
    pid: entry.info.pid,
    command: entry.info.command,
    running:
      entry.info.exitCode === null &&
      !entry.child.killed,
    exitCode: entry.info.exitCode
  }));
}

module.exports = {
  startProcess,
  getProcess,
  stopProcess,
  waitProcess,
  listProcesses
};
