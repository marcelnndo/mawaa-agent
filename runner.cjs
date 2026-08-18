const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const processManager = require('./process-manager.cjs');

const ROOT = path.resolve(__dirname, 'workspaces');


function workspace(userId) {
  const id = String(userId || '').trim();

  if (id.startsWith('/')) {
    return path.resolve(id);
  }

  return path.resolve(
    __dirname,
    'workspaces',
    id || 'default'
  );
}

function safePath(userId, target = '.') {
  const base = workspace(userId);
  const resolved = path.resolve(base, String(target));

  if (resolved !== base && !resolved.startsWith(base + path.sep)) {
    throw new Error('Path di luar workspace ditolak.');
  }

  return resolved;
}

async function run(command, args = [], options = {}) {
  const userId = options.userId || 'default';
  const cwd = safePath(userId, options.cwd || '.');
  const timeout = Number(options.timeout || 15000);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: {
        ...process.env,
        HOME: process.env.HOME
      }
    });

    let stdout = '';
    let stderr = '';
    let finished = false;

    const timer = setTimeout(() => {
      if (finished) return;

      finished = true;

      try {
        child.kill('SIGTERM');
      } catch {}

      reject(new Error(`Process timeout setelah ${timeout}ms`));
    }, timeout);

    child.stdout.on('data', data => {
      stdout += data.toString();
    });

    child.stderr.on('data', data => {
      stderr += data.toString();
    });

    child.on('error', error => {
      if (finished) return;

      finished = true;
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', code => {
      if (finished) return;

      finished = true;
      clearTimeout(timer);

      resolve({
        command: [command, ...args].join(' '),
        code,
        stdout,
        stderr
      });
    });
  });
}

async function writeFile(userId, target, content) {
  const file = safePath(userId, target);

  fs.mkdirSync(path.dirname(file), {
    recursive: true
  });

  fs.writeFileSync(file, String(content ?? ''), 'utf8');

  return {
    ok: true,
    path: path.relative(workspace(userId), file)
  };
}

async function readFile(userId, target) {
  const file = safePath(userId, target);

  return {
    ok: true,
    path: path.relative(workspace(userId), file),
    content: fs.readFileSync(file, 'utf8')
  };
}

async function listFiles(userId, target = '.') {
  const dir = safePath(userId, target);

  return fs.readdirSync(dir, {
    withFileTypes: true
  }).map(entry => ({
    name: entry.name,
    type: entry.isDirectory()
      ? 'directory'
      : 'file'
  }));
}


/*
 * PROCESS MANAGER
 *
 * Semua lifecycle process didelegasikan ke
 * process-manager.cjs agar registry tunggal.
 */

async function startProcess(userId, args) {
  return processManager.startProcess({
    id: String(args.id),
    command: String(args.command),
    args: Array.isArray(args.args)
      ? args.args.map(String)
      : [],
    cwd: workspace(userId)
  });
}

async function checkProcess(userId, id) {
  return processManager.getProcess(String(id));
}

async function stopProcess(userId, id) {
  return processManager.stopProcess(String(id));
}

async function waitProcess(userId, id, options = {}) {
  return processManager.waitProcess(String(id), options);
}

async function listProcesses() {
  return processManager.listProcesses();
}

module.exports = {
  workspace,
  safePath,
  run,
  writeFile,
  readFile,
  listFiles,
  startProcess,
  checkProcess,
  stopProcess,
  waitProcess,
  listProcesses
};
