#!/usr/bin/env node
import { Command } from "commander";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import ora from "ora";
import chalk from "chalk";
import { zipProject, sftpUpload, DeployConfig } from "./deploy";

const program = new Command();

program
  .name("snapdeploy")
  .description("One-command deploy: zip → SFTP → run remote commands")
  .version("1.0.0");

program
  .command("init")
  .description("Generate a snapdeploy.yml config file")
  .action(() => {
    const template = `host: your-server-ip
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
`;
    fs.writeFileSync("snapdeploy.yml", template);
    console.log(chalk.green("Created snapdeploy.yml — fill in your server details"));
  });

program
  .command("push")
  .description("Zip, upload, and deploy")
  .option("--dry-run", "Show what would happen without deploying")
  .option("--config <path>", "Config file path", "snapdeploy.yml")
  .action(async (opts) => {
    if (!fs.existsSync(opts.config)) {
      console.error(chalk.red(`Config not found: ${opts.config}. Run 'snapdeploy init' first.`));
      process.exit(1);
    }
    const raw = yaml.load(fs.readFileSync(opts.config, "utf8")) as Record<string, unknown>;
    const config: DeployConfig = {
      host: String(raw.host),
      user: String(raw.user),
      key: String(raw.key),
      port: Number(raw.port ?? 22),
      remotePath: String(raw.remote_path),
      ignore: (raw.ignore as string[]) ?? [],
      commands: (raw.commands as string[]) ?? [],
    };

    if (opts.dryRun) {
      console.log(chalk.yellow("Dry run — would deploy to:"), `${config.user}@${config.host}:${config.remotePath}`);
      console.log(chalk.yellow("Commands:"), config.commands.join(" && "));
      return;
    }

    let zipPath: string;
    const spinner1 = ora("Zipping project...").start();
    try {
      zipPath = await zipProject(process.cwd(), config.ignore);
      const size = (fs.statSync(zipPath).size / 1024).toFixed(1);
      spinner1.succeed(`Zipped project (${size} KB)`);
    } catch (e) {
      spinner1.fail("Failed to zip"); throw e;
    }

    const spinner2 = ora(`Uploading to ${config.host}...`).start();
    try {
      await sftpUpload(zipPath, config);
      spinner2.succeed("Deployed successfully");
    } catch (e) {
      spinner2.fail("Deploy failed"); throw e;
    }
  });

program.parse();
