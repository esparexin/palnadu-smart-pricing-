import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkCircularDependencies,
  checkContractsSsot,
  checkFileLimits,
  checkNaming,
  checkProhibitedPatterns,
  checkSecrets,
  validateGovernance,
} from './check-governance.js';

const temporaryRoots: string[] = [];

async function createRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'palnadu-gov-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots.splice(0).map((root) => rm(root, { force: true, recursive: true })),
  );
});

describe('check-governance', () => {
  it('accepts an empty repository with scanned directories', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'apps'), { recursive: true });
    await mkdir(join(root, 'packages'), { recursive: true });
    await mkdir(join(root, 'scripts'), { recursive: true });

    const violations = await validateGovernance(root);
    expect(violations).toEqual([]);
  });

  it('detects files exceeding line limits', async () => {
    const root = await createRoot();
    const filePath = 'apps/api/src/large-file.ts';
    const fullPath = join(root, filePath);
    await mkdir(join(root, 'apps/api/src'), { recursive: true });
    await writeFile(fullPath, Array(255).fill('const x = 1;').join('\n'));

    const violations = await checkFileLimits(root, [filePath]);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('max-file-lines');
  });

  it('detects non-kebab-case file naming', () => {
    const violations = checkNaming([
      'apps/api/src/BadFileName.ts',
      'packages/contracts/good-name.ts',
    ]);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('file-naming');
    expect(violations[0].file).toBe('apps/api/src/BadFileName.ts');
  });

  it('detects potential secrets in source code', async () => {
    const root = await createRoot();
    const filePath = 'apps/api/src/secret.ts';
    await mkdir(join(root, 'apps/api/src'), { recursive: true });
    await writeFile(
      join(root, filePath),
      'const token = "ghp_123456789012345678901234567890123456";\n',
    );

    const violations = await checkSecrets(root, [filePath]);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('secret-scan');
  });

  it('detects swallowed exceptions (empty catch blocks)', async () => {
    const root = await createRoot();
    const filePath = 'apps/api/src/swallow.ts';
    await mkdir(join(root, 'apps/api/src'), { recursive: true });
    await writeFile(join(root, filePath), 'try { doSomething(); } catch (e) {}\n');

    const violations = await checkProhibitedPatterns(root, [filePath]);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('no-swallowed-exceptions');
  });

  it('detects dummy placeholders and mocks in production code', async () => {
    const root = await createRoot();
    const dummyPath = 'apps/api/src/dummy.ts';
    const mockPath = 'packages/persistence/src/mock.ts';
    await mkdir(join(root, 'apps/api/src'), { recursive: true });
    await mkdir(join(root, 'packages/persistence/src'), { recursive: true });
    await writeFile(join(root, dummyPath), '// TODO: dummy logic\n');
    await writeFile(join(root, mockPath), 'const mockUser = { id: "1" };\n');

    const violations = await checkProhibitedPatterns(root, [dummyPath, mockPath]);
    expect(violations).toHaveLength(2);
    expect(violations.map((v) => v.rule)).toEqual([
      'no-dummy-placeholders',
      'no-mock-in-production',
    ]);
  });

  it('detects circular dependencies between modules', async () => {
    const root = await createRoot();
    await mkdir(join(root, 'apps/api/src'), { recursive: true });
    const fileA = 'apps/api/src/a.ts';
    const fileB = 'apps/api/src/b.ts';
    await writeFile(join(root, fileA), "import './b.js';\nexport const a = 1;\n");
    await writeFile(join(root, fileB), "import './a.js';\nexport const b = 2;\n");

    const violations = await checkCircularDependencies(root, [fileA, fileB]);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].rule).toBe('circular-dependency');
  });

  it('enforces SSOT purity for packages/contracts', async () => {
    const root = await createRoot();
    const contractPath = 'packages/contracts/src/bad.ts';
    await mkdir(join(root, 'packages/contracts/src'), { recursive: true });
    await writeFile(join(root, contractPath), "import { db } from '@palnadu/persistence';\n");

    const violations = await checkContractsSsot(root, [contractPath]);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe('contracts-ssot-violation');
  });
});
