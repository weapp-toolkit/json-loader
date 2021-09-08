import cp from 'child_process';
import _spawn from 'cross-spawn';

function spawn<T>(cmd: string, args: string[], options?: cp.SpawnOptionsWithoutStdio): Promise<T | boolean> {
  return new Promise((resolve) => {
    const sp = _spawn(cmd, args, {
      stdio: [0, 1, 2],
      ...options,
    });
    sp?.stdout?.on('data', (data: T) => {
      resolve(data);
    });
    sp.on('error', (err) => {
      console.trace(err);
    });
    sp.on('close', (code) => {
      if (code !== 0) {
        process.exit(code || -1);
      } else {
        resolve(true);
      }
    });
  });
}

function execSync(cmd: string): string {
  return cp.execSync(cmd).toString();
}

function spawnSync(cmd: string, args: string[], options?: cp.SpawnSyncOptionsWithBufferEncoding) {
  return _spawn.sync(cmd, args, {
    stdio: [0, 1, 2],
    ...options,
  })?.stdout;
}

export default spawn;
export { execSync, spawnSync };
