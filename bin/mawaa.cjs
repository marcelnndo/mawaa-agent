#!/usr/bin/env node

const readline = require('readline');
const { executeRequest } = require('../agent.cjs');

const cwd = process.cwd();

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m'
};

const color = (c, t) => `${c}${t}${C.reset}`;
const line = (c = '─', n = 46) => c.repeat(n);

function banner() {
  console.log();
  console.log(color(C.cyan + C.bold, '╭──────────────────────────────────────────────╮'));
  console.log(color(C.cyan + C.bold, '│                 M A W A A                    │'));
  console.log(color(C.cyan + C.bold, '│             AI CODING AGENT                  │'));
  console.log(color(C.cyan + C.bold, '╰──────────────────────────────────────────────╯'));
  console.log();
}

function projectInfo() {
  console.log(color(C.gray, `  Project : ${cwd}`));
  console.log(color(C.gray, '  Agent   : Mawaa AI'));
  console.log(color(C.gray, '  Safety  : Git approval enabled'));
  console.log();
}

function toolLabel(tool, recovery = false) {
  console.log(
    `  ${color(recovery ? C.yellow : C.cyan, recovery ? '↻' : '→')} ${color(C.white, tool)}`
  );
}

function successPanel() {
  console.log();
  console.log(color(C.green + C.bold, `╭─ ✓ DONE ${line('─', 38)}╮`));
  console.log(color(C.green + C.bold, '│ Task completed successfully             │'));
  console.log(color(C.green + C.bold, `╰${line('─', 46)}╯`));
}

function errorPanel(message) {
  console.log();
  console.log(color(C.red + C.bold, `╭─ ✗ ERROR ${line('─', 35)}╮`));
  console.log(color(C.red, `│ ${String(message).slice(0, 41).padEnd(41)} │`));
  console.log(color(C.red + C.bold, `╰${line('─', 46)}╯`));
}

function approvalPrompt(command) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.log();
    console.log(color(C.yellow + C.bold, `╭─ ⚠ APPROVAL REQUIRED ${line('─', 24)}╮`));
    console.log(color(C.yellow + C.bold, '│'));
    console.log(color(C.white, '│ Mawaa ingin menjalankan:'));
    console.log(color(C.cyan + C.bold, `│   ${command}`));
    console.log(color(C.yellow + C.bold, '│'));
    console.log(color(C.yellow, '│ Operasi ini membutuhkan persetujuan.'));
    console.log(color(C.yellow + C.bold, `╰${line('─', 46)}╯`));

    rl.question(
      color(C.white + C.bold, '\n  Continue? [y/N] '),
      (answer) => {
        rl.close();

        const value = String(answer)
          .trim()
          .toLowerCase();

        resolve(value === 'y' || value === 'yes');
      }
    );
  });
}

function printResult(item) {
  if (item.ok) {
    if (item.result && typeof item.result === 'object') {
      console.log(color(
        C.gray,
        JSON.stringify(item.result, null, 2)
      ));
    } else {
      console.log(color(C.white, String(item.result ?? '')));
    }

    return;
  }

  const message =
    item.error ||
    item.result?.stderr ||
    item.result?.error ||
    'Operation failed.';

  errorPanel(message);
}

async function run(request) {
  if (!request) return;

  banner();
  projectInfo();

  console.log(color(
    C.magenta + C.bold,
    '╭─ MAWAA ─────────────────────────────────────╮'
  ));
  console.log(color(C.white, '│ Analyzing request...'));
  console.log(color(
    C.magenta + C.bold,
    '╰─────────────────────────────────────────────╯'
  ));
  console.log();

  try {
    const result = await executeRequest({
      userId: cwd,
      request,

      onApproval: approvalPrompt,

      onStep: ({ step, recovery }) => {
        toolLabel(step.tool, recovery);
      }
    });

    console.log();
    console.log(color(
      C.cyan + C.bold,
      `╭─ RESULT ${line('─', 37)}╮`
    ));

    for (const item of result) {
      printResult(item);
    }

    console.log(color(
      C.cyan + C.bold,
      `╰${line('─', 46)}╯`
    ));

    if (!result.some(item => !item.ok)) {
      successPanel();
    }

  } catch (error) {
    errorPanel(
      error?.message || 'Unknown Mawaa error.'
    );
  }
}

function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: color(C.cyan + C.bold, '\nMawaa > ')
  });

  banner();
  projectInfo();

  console.log(color(
    C.gray,
    '  Ketik "exit" atau "quit" untuk keluar.'
  ));

  rl.prompt();

  rl.on('line', async (input) => {
    const text = input.trim();

    if (!text) {
      rl.prompt();
      return;
    }

    if (
      text.toLowerCase() === 'exit' ||
      text.toLowerCase() === 'quit'
    ) {
      rl.close();
      return;
    }

    await run(text);
    rl.prompt();
  });

  rl.on('close', () => {
    console.log(color(C.gray, '\nBye.'));
  });
}

const request = process.argv.slice(2).join(' ');

if (request) {
  run(request);
} else {
  interactiveMode();
}
