import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { validateWorkspace } from './check-workspace.js';

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'palnadu-workspace-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('validateWorkspace', () => {
  it('accepts a repository without application packages', async () => {
    await expect(validateWorkspace(await createRoot())).resolves.toBeUndefined();
  });

  it('rejects a workspace directory without a package manifest', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'apps', 'web'), { recursive: true });

    await expect(validateWorkspace(root)).rejects.toThrow(
      'Workspace directory "apps/web" must contain a package.json.',
    );
  });

  it('accepts a named workspace package', async () => {
    const root = await createRoot();
    const packageDirectory = join(root, 'packages', 'contracts');
    await mkdir(packageDirectory, { recursive: true });
    await writeFile(
      join(packageDirectory, 'package.json'),
      JSON.stringify({ name: '@palnadu/contracts' }),
    );

    await expect(validateWorkspace(root)).resolves.toBeUndefined();
  });

  it('rejects duplicate workspace package names', async () => {
    const root = await createRoot();

    for (const packageDirectory of ['apps/api', 'packages/api']) {
      const directory = join(root, packageDirectory);
      await mkdir(directory, { recursive: true });
      await writeFile(join(directory, 'package.json'), JSON.stringify({ name: 'api' }));
    }

    await expect(validateWorkspace(root)).rejects.toThrow('Duplicate workspace package name "api"');
  });
});
