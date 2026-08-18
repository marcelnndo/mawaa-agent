const runner = require('./runner.cjs');
const processManager = require('./process-manager.cjs');

const MAX_RECOVERY = 5;

const tools = {
  write_file: async (userId, args) => {
    const content = String(args.content ?? '');

    return runner.writeFile(
      userId,
      args.path,
      content
    );
  },

  read_file: async (userId, args) =>
    runner.readFile(userId, args.path),

  list_files: async (userId, args) =>
    runner.listFiles(userId, args.path || '.'),

  run_bash: async (userId, args) =>
    runner.run('bash', ['-lc', String(args.script || '')], {
      userId,
      timeout: Number(args.timeout || 120000)
    }),

  run_python: async (userId, args) =>
    runner.run('python3', [String(args.path)], {
      userId,
      timeout: Number(args.timeout || 120000)
    }),

  run_node: async (userId, args) =>
    runner.run('node', [String(args.path)], {
      userId,
      timeout: Number(args.timeout || 120000)
    }),

  mkdir: async (userId, args) =>
    runner.run('mkdir', ['-p', String(args.path)], {
      userId,
      timeout: 5000
    }),

  npm: async (userId, args) =>
    runner.run('npm', args.args || [], {
      userId,
      timeout: Number(args.timeout || 120000)
    }),

  start_process: async (userId, args) => {
    return processManager.startProcess({
      id: String(args.id),
      command: String(args.command),
      args: Array.isArray(args.args)
        ? args.args.map(String)
        : [],
      cwd: runner.workspace(userId)
    });
  },

  check_process: async (userId, args) =>
    processManager.getProcess(String(args.id)),

  stop_process: async (userId, args) =>
    processManager.stopProcess(String(args.id)),

  wait_process: async (userId, args) =>
    processManager.waitProcess(String(args.id), {
      pattern: String(args.pattern || ''),
      timeout: Number(args.timeout || 10000),
      interval: Number(args.interval || 100)
    }),

  list_processes: async () =>
    processManager.listProcesses(),

  git_status: async (userId) =>
    runner.run(
      'git',
      ['status', '--short', '--branch'],
      {
        userId,
        timeout: 30000
      }
    ),

  git_diff: async (userId, args) =>
    runner.run(
      'git',
      ['diff', '--', String(args.path || '')],
      {
        userId,
        timeout: 30000
      }
    ),

  git_add: async (userId, args) =>
    runner.run(
      'git',
      ['add', ...(Array.isArray(args.paths) ? args.paths.map(String) : ['.'])],
      {
        userId,
        timeout: 30000
      }
    ),

  git_commit: async (userId, args) =>
    runner.run(
      'git',
      [
        'commit',
        '-m',
        String(args.message || 'chore: update project')
      ],
      {
        userId,
        timeout: 30000
      }
    )
};

function validateStep(step) {
  if (!step || typeof step !== 'object') {
    throw new Error('Invalid agent step.');
  }

  if (!tools[step.tool]) {
    throw new Error(`Tool tidak dikenal: ${step.tool}`);
  }

  if (!step.args || typeof step.args !== 'object') {
    step.args = {};
  }

  return step;
}

async function executeTool(userId, step) {
  validateStep(step);
  return tools[step.tool](userId, step.args);
}

function shouldRetry(result) {
  if (!result) return false;

  if (result.ok === false && typeof result.code !== 'number') {
    return true;
  }

  if (typeof result.code === 'number') {
    return result.code !== 0;
  }

  return Boolean(result.error);
}

function recoveryFor(step, result) {
  const stderr = String(result?.stderr || '');

  if (
    step.tool === 'run_node' &&
    /Cannot find module ['"]([^'"]+)['"]/i.test(stderr)
  ) {
    const match = stderr.match(
      /Cannot find module ['"]([^'"]+)['"]/i
    );

    if (match) {
      return {
        tool: 'npm',
        args: {
          args: ['install', match[1]]
        }
      };
    }
  }

  if (
    step.tool === 'run_python' &&
    /No module named ['"]([^'"]+)['"]/i.test(stderr)
  ) {
    const match = stderr.match(
      /No module named ['"]([^'"]+)['"]/i
    );

    if (match) {
      return {
        tool: 'run_bash',
        args: {
          script: `python3 -m pip install ${JSON.stringify(match[1])}`
        }
      };
    }
  }

  return null;
}

async function executePlan({
  userId = 'default',
  steps = [],
  onStep,
  onApproval
}) {
  if (!Array.isArray(steps)) {
    throw new Error('steps harus berupa array.');
  }

  const results = [];

  for (let index = 0; index < steps.length; index++) {
    const originalStep = validateStep({
      ...steps[index]
    });

    let currentStep = originalStep;
    let attempts = 0;

    while (true) {
      attempts++;

      onStep?.({
        index,
        total: steps.length,
        step: currentStep,
        recovery: currentStep !== originalStep
      });

      try {
        /*
         * Approval gate untuk operasi Git.
         * Operasi yang mengubah repository harus
         * mendapat persetujuan eksplisit dari user.
         */
        if (currentStep.tool === 'run_bash') {
          const script = String(
            currentStep.args?.script || ''
          );

          const gitRisk =
            /(^|[;&|])\s*git\s+(add|commit|push|reset|clean|checkout|restore)\b/i
              .test(script) ||
            /^git\s+(add|commit|push|reset|clean|checkout|restore)\b/i
              .test(script);

          if (gitRisk) {
            if (!onApproval) {
              results.push({
                index,
                tool: currentStep.tool,
                args: currentStep.args,
                ok: false,
                attempts,
                error:
                  'Operasi Git membutuhkan approval user.'
              });

              break;
            }

            const approved =
              await onApproval(script);

            if (!approved) {
              results.push({
                index,
                tool: currentStep.tool,
                args: currentStep.args,
                ok: false,
                attempts,
                error:
                  'Operasi Git dibatalkan oleh user.'
              });

              break;
            }
          }
        }

        const result = await executeTool(
          userId,
          currentStep
        );

        const failed = shouldRetry(result);

        results.push({
          index,
          tool: currentStep.tool,
          args: currentStep.args,
          ok: !failed,
          attempts,
          result
        });

        if (!failed) break;

        if (attempts >= MAX_RECOVERY) break;

        const recovery = recoveryFor(
          currentStep,
          result
        );

        if (!recovery) break;

        currentStep = recovery;
      } catch (error) {
        results.push({
          index,
          tool: currentStep.tool,
          args: currentStep.args,
          ok: false,
          attempts,
          error: error.message
        });

        break;
      }
    }
  }

  return results;
}


const PLANNER_URL =
  process.env.MAWAA_PLANNER_URL ||
  'https://puruboy-api.vercel.app/api/ai/gemini-v2';

async function createAIPlan(request) {
  const prompt = `
Kamu adalah planner untuk Mawaa Agent.

Ubah permintaan user menjadi JSON valid dengan format:

{
  "steps": [
    {
      "tool": "write_file",
      "args": {
        "path": "nama-file",
        "content": "isi file"
      }
    }
  ]
}

Tool yang tersedia:
- write_file { path, content }
- read_file { path }
- list_files { path }
- mkdir { path }
- run_bash { script, timeout }
- run_python { path, timeout }
- run_node { path, timeout }
- npm { args, timeout }
- start_process { id, command, args }
- check_process { id }
- stop_process { id }
- wait_process { id, pattern, timeout, interval }
- list_processes {}

Aturan:
- Output HARUS JSON.
- Jangan gunakan markdown.
- Semua path relatif.
- Jangan gunakan ../.
- Jangan hapus file.
- Untuk "buat file X berisi Y", gunakan write_file.
- Untuk menjalankan program, gunakan run_node/run_python/run_bash sesuai kebutuhan.
- Jika hanya melihat file, gunakan list_files.

Permintaan user:
${String(request)}
`.trim();

  const url =
    `${PLANNER_URL}?prompt=${encodeURIComponent(prompt)}` +
    `&model=gemini-3-flash`;

  let response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    response = await fetch(PLANNER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        prompt,
        model: 'gemini-3-flash'
      })
    });
  }

  if (!response.ok) {
    throw new Error(`Planner HTTP ${response.status}`);
  }

  const raw = await response.text();

  let data;

  try {
    data = JSON.parse(raw);
  } catch {
    data = { result: raw };
  }

  let text =
    data?.result?.answer ||
    data?.answer ||
    data?.response ||
    data?.text ||
    data?.result ||
    raw;

  if (typeof text !== 'string') {
    text = JSON.stringify(text);
  }

  text = text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  const parsed = JSON.parse(text);

  const steps = Array.isArray(parsed)
    ? parsed
    : parsed.steps;

  if (!Array.isArray(steps) || !steps.length) {
    throw new Error('AI planner menghasilkan steps kosong.');
  }

  return steps.map(step => validateStep({
    ...step,
    args: step.args || {}
  }));
}

/*
 * Planner lokal sederhana.
 *
 * AI planner bisa ditambahkan kembali nanti.
 * Untuk sekarang agent tetap stabil tanpa bergantung
 * pada endpoint planner eksternal.
 */

function createPlan(request) {
  const text = String(request || '').toLowerCase();
  const steps = [];

  // LIST FILE
  if (
    text.includes('list file') ||
    text.includes('daftar file') ||
    text.includes('lihat file') ||
    text.includes('cek file')
  ) {
    steps.push({
      tool: 'list_files',
      args: {
        path: '.'
      }
    });

    return steps;
  }

  // BASH / TERMINAL
  if (
    text.includes('bash') ||
    text.includes('terminal') ||
    text.includes('shell')
  ) {
    steps.push({
      tool: 'run_bash',
      args: {
        script: 'pwd && ls -la'
      }
    });

    return steps;
  }

  // DEFAULT
  steps.push({
    tool: 'list_files',
    args: {
      path: '.'
    }
  });

  return steps;
}

async function executeRequest({
  userId = 'default',
  request,
  onStep,
  onApproval
}) {
  let steps;

  try {
    console.log('[Mawaa Agent] AI planner...');
    steps = await createAIPlan(request);
    console.log(`[Mawaa Agent] ${steps.length} step dibuat.`);
  } catch (error) {
    console.error('[Mawaa Agent] AI planner gagal:', error.message);
    console.log('[Mawaa Agent] Menggunakan fallback planner lokal.');
    steps = createPlan(request);
  }

  return executePlan({
    userId,
    steps,
    onStep,
    onApproval
  });
}

module.exports = {
  tools,
  createPlan,
  createAIPlan,
  executePlan,
  executeRequest,
  MAX_RECOVERY
};
