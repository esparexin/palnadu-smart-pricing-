import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACE_ROOTS = ['apps', 'packages'] as const;

function hasErrorCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

function hasPackageName(value: unknown): value is { name: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    typeof value.name === 'string' &&
    value.name.trim().length > 0
  );
}

export async function validateWorkspace(rootDirectory: string): Promise<void> {
  const root = resolve(rootDirectory);
  const packageNames = new Map<string, string>();

  for (const workspaceName of WORKSPACE_ROOTS) {
    const workspaceRoot = join(root, workspaceName);
    let entries;

    try {
      entries = await readdir(workspaceRoot, { withFileTypes: true });
    } catch (error) {
      if (hasErrorCode(error, 'ENOENT')) {
        continue;
      }

      throw error;
    }

    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageDirectory = join(workspaceRoot, entry.name);
      const manifestPath = join(packageDirectory, 'package.json');
      let manifestText: string;

      try {
        manifestText = await readFile(manifestPath, 'utf8');
      } catch (error) {
        if (hasErrorCode(error, 'ENOENT')) {
          throw new Error(
            `Workspace directory "${relative(root, packageDirectory)}" must contain a package.json.`,
            { cause: error },
          );
        }

        throw error;
      }

      let manifest: unknown;

      try {
        manifest = JSON.parse(manifestText);
      } catch (error) {
        throw new Error(`Invalid JSON in "${relative(root, manifestPath)}".`, {
          cause: error,
        });
      }

      if (!hasPackageName(manifest)) {
        throw new Error(`"${relative(root, manifestPath)}" must define a non-empty package name.`);
      }

      const packageLocation = relative(root, packageDirectory);
      const previousLocation = packageNames.get(manifest.name);

      if (previousLocation !== undefined) {
        throw new Error(
          `Duplicate workspace package name "${manifest.name}" in "${previousLocation}" and "${packageLocation}".`,
        );
      }

      packageNames.set(manifest.name, packageLocation);
    }
  }
}

const scriptPath = process.argv[1] === undefined ? '' : resolve(process.argv[1]);

if (scriptPath === fileURLToPath(import.meta.url)) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  await validateWorkspace(repositoryRoot);
  console.info('Workspace package roots are valid.');
}
