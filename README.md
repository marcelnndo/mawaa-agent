# Mawaa AI

![License](https://img.shields.io/badge/license-MIT-blue.svg)

Mawaa AI adalah agen otonom cerdas yang dirancang untuk membantu pengembang dalam mengeksekusi tugas-tugas teknis secara otomatis. Dengan integrasi berbagai tool mulai dari manajemen file hingga eksekusi runtime, Mawaa AI mempercepat workflow pengembangan perangkat lunak.

## 🚀 Fitur Utama

- **Multi-Runtime Support**: Menjalankan script Python, Node.js, dan Bash.
- **File System Management**: Membuat, membaca, dan mengelola struktur folder.
- **Process Control**: Mengelola proses background secara efisien.
- **Git Automation**: Terintegrasi langsung dengan perintah Git untuk manajemen repositori.
- **Planner System**: Mengubah instruksi bahasa alami menjadi rangkaian aksi teknis.

## 📋 Instalasi

1. Clone repositori ini:
   ```bash
   git clone https://github.com/user/mawaa-ai.git
   cd mawaa-ai
   ```

2. Install dependensi:
   ```bash
   npm install
   ```

3. Siapkan environment:
   ```bash
   cp .env.example .env
   ```

## 💻 Penggunaan

Jalankan agent dengan perintah berikut:

```bash
npm start
```

### Contoh Perintah User

- "Buatkan boilerplate React project dan push ke repo baru."
- "Analisis file data.py dan jalankan dengan Python."
- "Cari semua file .log dan hapus yang berumur lebih dari 7 hari."

## 📂 Struktur Project

```text
.
├── src/                # Logika inti Agent dan Planner
├── tools/              # Definisi tool (Bash, File System, dll)
├── config/             # Konfigurasi sistem
├── tests/              # Unit testing
└── README.md           # Dokumentasi project
```

## 🛠️ Tool yang Tersedia

- `write_file` / `read_file`: Operasi I/O file.
- `run_bash`: Eksekusi terminal command.
- `run_python` / `run_node`: Eksekusi script bahasa tertentu.
- `git`: Manajemen version control.

## 📄 Lisensi

Project ini dilisensikan di bawah MIT License.
