import { execSync } from 'child_process';
import path from 'path';

const SERVER_DIR = path.resolve(__dirname, '../server');

function run(cmd: string) {
  console.log(`[setup] ${cmd}`);
  execSync(cmd, { cwd: SERVER_DIR, stdio: 'inherit' });
}

export default async function globalSetup() {
  run('npm run db:migrate:test');
  run('npm run db:seed:test');
}
