import * as fs from "fs";
import * as path from "path";
import * as archiver from "archiver";
import { Client } from "ssh2";

export interface DeployConfig {
  host: string;
  user: string;
  key: string;
  port?: number;
  remotePath: string;
  ignore: string[];
  commands: string[];
}

export async function zipProject(srcDir: string, ignore: string[]): Promise<string> {
  const outPath = path.join(require("os").tmpdir(), `snapdeploy-${Date.now()}.zip`);
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver.create("zip", { zlib: { level: 9 } });
    archive.pipe(output);
    archive.glob("**/*", {
      cwd: srcDir,
      ignore: [...ignore, ".git/**", "node_modules/**"],
    });
    output.on("close", () => resolve(outPath));
    archive.on("error", reject);
    archive.finalize();
  });
}

export async function sftpUpload(zipPath: string, config: DeployConfig): Promise<void> {
  const keyPath = config.key.replace("~", require("os").homedir());
  const privateKey = fs.readFileSync(keyPath);

  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on("ready", () => {
      conn.sftp((err, sftp) => {
        if (err) { reject(err); return; }
        const remoteZip = `${config.remotePath}/snapdeploy.zip`;
        sftp.fastPut(zipPath, remoteZip, {}, (putErr) => {
          if (putErr) { reject(putErr); return; }
          conn.exec(
            `cd ${config.remotePath} && unzip -o snapdeploy.zip && rm snapdeploy.zip && ${config.commands.join(" && ")}`,
            (execErr, stream) => {
              if (execErr) { reject(execErr); return; }
              stream.on("data", (d: Buffer) => process.stdout.write(d.toString()));
              stream.stderr.on("data", (d: Buffer) => process.stderr.write(d.toString()));
              stream.on("close", () => { conn.end(); resolve(); });
            }
          );
        });
      });
    })
    .on("error", reject)
    .connect({ host: config.host, port: config.port ?? 22, username: config.user, privateKey });
  });
}
