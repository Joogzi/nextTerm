import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const nextTerm = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dataio = resolve(nextTerm, '../dataio-26/3d');
const app = join(nextTerm, 'app');
const run = (cwd, args) => execFileSync('bun', args, { cwd, stdio: 'inherit' });

run(app, ['install', '--frozen-lockfile']);
run(app, ['run', 'check:snapshot']);
run(app, ['run', 'test:demo']);
run(app, ['run', 'build:demo']);
run(dataio, ['install', '--frozen-lockfile']);
run(dataio, ['x', 'tsc', '--noEmit']);
run(dataio, ['run', 'build']);

// Use a fresh release directory; never overwrite an existing site or source checkout.
const release = await mkdtemp(join(tmpdir(), 'portfolio-pages-'));
const site = join(release, 'site');
await mkdir(site);
await cp(join(app, 'dist'), join(site, 'nextTerm'), { recursive: true });
await cp(join(dataio, 'dist'), join(site, 'dataio2026'), { recursive: true });
await writeFile(join(site, '.nojekyll'), '');
await cp(join(nextTerm, 'deploy/portfolio-pages/.github'), join(release, '.github'), { recursive: true });
await cp(join(nextTerm, 'deploy/portfolio-pages/README.md'), join(release, 'README.md'));
console.log(`\nPrepared Pages repository files: ${release}`);
