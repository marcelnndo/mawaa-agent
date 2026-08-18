Mawaa AI

«AI coding agent untuk terminal — bantu ngoding, menjalankan command, mengelola file, dan bekerja dengan project secara langsung.»

Mawaa AI adalah terminal coding agent yang dirancang untuk membantu developer mengerjakan task menggunakan bahasa natural.

Cukup kasih instruksi:

mawaa "buat fitur login sederhana"

Mawaa akan menganalisis request, membuat execution plan, lalu menjalankan tools yang diperlukan.

Features

- AI-powered task planning
- File creation and modification
- Bash command execution
- npm command execution
- Python execution
- Git operations
- Automatic recovery untuk beberapa command yang gagal
- Git approval gate untuk operasi Git
- CLI interface yang clean dan interaktif
- Output terminal bergaya agent
- Mobile-friendly untuk penggunaan melalui Termux
- Bisa digunakan sebagai global npm package

Installation

Pastikan Node.js ">=20" sudah terinstall.

Install Mawaa secara global:

npm install -g @arcelnando/mawaa

Cek instalasi:

mawaa --help

Atau langsung jalankan:

mawaa "cek status project ini"

Usage

Jalankan Mawaa dengan satu request:

mawaa "buat file hello.js yang mencetak Hello World"

Mawaa juga bisa digunakan dalam interactive mode:

mawaa

Kemudian:

Mawaa > buat file config.js
Mawaa > cek struktur project
Mawaa > jalankan npm run build
Mawaa > exit

Git Safety

Mawaa memiliki Git approval gate.

Operasi Git yang dianggap membutuhkan approval akan meminta konfirmasi terlebih dahulu:

⚠️ Mawaa ingin menjalankan:
git add src/app.js && git commit -m "feat: update app"

Lanjutkan? [y/N]

Masukkan:

y

untuk mengizinkan command.

Masukkan:

n

atau cukup tekan "Enter" untuk menolak.

Fitur ini membantu mencegah operasi Git dijalankan secara tidak sengaja.

Example

Request:

mawaa "buat fitur baru lalu jalankan npm run build"

Mawaa dapat membuat execution plan seperti:

[Mawaa Agent] AI planner...
[Mawaa Agent] 2 step dibuat.

→ write_file
→ npm

Kemudian menampilkan hasil setiap step:

╭─ RESULT ─────────────────────────────────────╮
│ Build completed successfully                 │
╰──────────────────────────────────────────────╯

╭─ ✓ DONE ─────────────────────────────────────╮
│ Task completed successfully                  │
╰──────────────────────────────────────────────╯

Git Commands

Contoh:

mawaa "cek status git project ini"

mawaa "buat commit perubahan dengan pesan feat: add login"

Untuk command Git yang membutuhkan approval, Mawaa akan meminta konfirmasi sebelum eksekusi.

File Operations

Mawaa dapat bekerja dengan file project.

Contoh:

mawaa "buat file src/config.js"

mawaa "ubah file src/app.js dan tambahkan fitur dark mode"

mawaa "buat README.md untuk project ini"

npm

Mawaa dapat menjalankan command npm ketika diperlukan.

Contoh:

mawaa "install dependency axios"

mawaa "jalankan npm run build"

mawaa "jalankan npm test"

Python

Mawaa juga dapat menjalankan Python ketika task membutuhkannya.

Contoh:

mawaa "buat script Python untuk menghitung factorial"

Jika dependency Python tertentu belum tersedia, Mawaa memiliki mekanisme recovery untuk beberapa kasus dependency yang hilang.

Architecture

Struktur package:

mawaa-agent/
├── agent.cjs
├── runner.cjs
├── process-manager.cjs
├── package.json
└── bin/
    └── mawaa.cjs

"agent.cjs"

Core agent yang menangani:

- AI planning
- execution plan
- tool execution
- recovery
- request handling
- Git approval enforcement

"bin/mawaa.cjs"

CLI entry point.

File ini menyediakan command:

mawaa

serta interactive terminal interface.

"runner.cjs"

Menangani proses execution yang diperlukan oleh agent.

"process-manager.cjs"

Menyediakan process management untuk command yang dijalankan oleh agent.

Requirements

- Node.js ">=20"
- npm
- Git untuk fitur Git
- API/AI configuration yang digunakan oleh versi Mawaa

Project

GitHub:
https://github.com/arcelnando/mawaa-agent

npm:
https://www.npmjs.com/package/@arcelnando/mawaa

Development

Clone repository:

git clone https://github.com/arcelnando/mawaa-agent.git
cd mawaa-agent

Install dependencies jika diperlukan:

npm install

Jalankan CLI dari source:

node bin/mawaa.cjs

Publishing

Package ini dipublikasikan sebagai:

@arcelnando/mawaa

Untuk membuat release baru:

npm version patch
npm publish --access public

Kemudian push perubahan:

git push origin main --follow-tags

License

MIT
