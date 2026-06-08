# SnapDeploy

> Node.js CLI that zips your project, SFTPs it to a VPS, and runs your deploy script — one command

## What it does
Replaces the repetitive cycle of `zip → scp → ssh → cd → unzip → restart`. Configure once in `snapdeploy.yml`, then run `snapdeploy push` to zip your project, upload it via SFTP, unzip on the server, and run your deploy commands — all in one shot.

## Quick Start
```bash
git clone https://github.com/MrHassan2027/SnapDeploy
cd SnapDeploy
npm install
npm run build

# In your project root:
node /path/to/snapdeploy/dist/cli.js init   # generates snapdeploy.yml
node /path/to/snapdeploy/dist/cli.js push   # zip → upload → deploy
```

## Config (`snapdeploy.yml`)
```yaml
host: 123.45.67.89
user: ubuntu
key: ~/.ssh/id_rsa
remote_path: /var/www/myapp
ignore:
  - node_modules
  - .env
  - dist
commands:
  - npm install --production
  - pm2 restart myapp
```

## Features
- SSH key auth (no password prompts)
- `.gitignore`-style `ignore` list — never uploads `node_modules` by default
- Progress bar during upload (shows MB/s)
- Works with any language/framework — just configure the deploy commands

## Tech Stack
| Tool | Why |
|------|-----|
| Node.js + TypeScript | CLI tooling |
| `ssh2` | SFTP + SSH command execution |
| `archiver` | Zip project files |
| `commander` | CLI argument parsing |
| `ora` + `chalk` | Spinner + colored output |
