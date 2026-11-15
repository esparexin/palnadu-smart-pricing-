import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_SOURCE_FILE_LINES = 249;
const SCANNED_DIRS = ['apps', 'packages', 'scripts'] as const;

export const JUSTIFIED_FILE_SIZE_EXCEPTIONS = new Map<string, string>();

export interface GovernanceViolation {
  file: string;
  rule: string;
  message: string;
}

export async function getTrackedFiles(root: string): Promise<string[]> {
  const result: string[] = [];
  for (const dirName of SCANNED_DIRS) {
    await scan(join(root, dirName), root, result);
  }
  return result.sort();
}

async function scan(current: string, root: string, acc: string[]): Promise<void> {
  let entries;
  try {
    entries = await readdir(current, { withFileTypes: true });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && err.code === 'ENOENT') return;
    throw err;
  }
  for (const e of entries) {
    if (['node_modules', 'dist', 'coverage'].includes(e.name)) continue;
    const full = join(current, e.name);
    if (e.isDirectory()) {
      if (!relative(root, full).startsWith('packages/persistence/drizzle')) {
        await scan(full, root, acc);
      }
    } else if (e.isFile() && /\.(ts|js|mjs)$/.test(e.name)) {
      acc.push(relative(root, full));
    }
  }
}

function isExempt(rel: string): boolean {
  return (
    rel.endsWith('.test.ts') ||
    rel.endsWith('.db.test.ts') ||
    rel === 'scripts/check-governance.ts' ||
    rel === 'scripts/check-governance.mjs'
  );
}

export async function checkFileLimits(
  root: string,
  files: string[],
): Promise<GovernanceViolation[]> {
  const violations: GovernanceViolation[] = [];
  for (const rel of files) {
    if (isExempt(rel)) continue;
    const content = await readFile(join(root, rel), 'utf8');
    const lines = content.split('\n').length;
    if (lines > MAX_SOURCE_FILE_LINES && !JUSTIFIED_FILE_SIZE_EXCEPTIONS.has(rel)) {
      violations.push({
        file: rel,
        rule: 'max-file-lines',
        message: `File exceeds ${MAX_SOURCE_FILE_LINES} lines (${lines} lines) without exception.`,
      });
    }
  }
  return violations;
}

export function checkNaming(files: string[]): GovernanceViolation[] {
  const violations: GovernanceViolation[] = [];
  const pattern = /^[a-z0-9]+([.-][a-z0-9]+)*\.(ts|js|mjs)$/;
  for (const rel of files) {
    const name = rel.split('/').pop() ?? '';
    if (!pattern.test(name)) {
      violations.push({
        file: rel,
        rule: 'file-naming',
        message: `File "${name}" must follow lowercase kebab-case/dot-delimited naming.`,
      });
    }
  }
  return violations;
}

export async function checkSecrets(root: string, files: string[]): Promise<GovernanceViolation[]> {
  const violations: GovernanceViolation[] = [];
  const patterns = [
    { name: 'Private Key', re: /-----BEGIN (?:[A-Z ]+)?PRIVATE KEY-----/ },
    { name: 'AWS Access Key', re: /\bAKIA[0-9A-Z]{16}\b/ },
    { name: 'GitHub Token', re: /\b(ghp|gho)_[a-zA-Z0-9]{36}\b/ },
    { name: 'GitHub PAT', re: /\bgithub_pat_[a-zA-Z0-9_]{82}\b/ },
  ];
  for (const rel of files) {
    if (isExempt(rel)) continue;
    const content = await readFile(join(root, rel), 'utf8');
    for (const p of patterns) {
      if (p.re.test(content)) {
        violations.push({
          file: rel,
          rule: 'secret-scan',
          message: `Detected potential secret matching pattern: ${p.name}`,
        });
      }
    }
  }
  return violations;
}

export async function checkProhibitedPatterns(
  root: string,
  files: string[],
): Promise<GovernanceViolation[]> {
  const violations: GovernanceViolation[] = [];
  const emptyCatch = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/;
  const dummyPlaceholder = new RegExp(
    '\\b(TODO|FIXME):\\s*(?:dummy|fake|placeholder|alien|zombie|dead|legacy|culprit)\\b',
    'i',
  );
  const mockAssignmentRegex = new RegExp('\\bconst\\s+' + 'mock[A-Z]\\w+\\s*=');

  for (const rel of files) {
    if (isExempt(rel)) continue;
    const content = await readFile(join(root, rel), 'utf8');
    if (emptyCatch.test(content)) {
      violations.push({
        file: rel,
        rule: 'no-swallowed-exceptions',
        message: 'Empty catch block detected (swallowed exception).',
      });
    }
    if (dummyPlaceholder.test(content)) {
      violations.push({
        file: rel,
        rule: 'no-dummy-placeholders',
        message: 'Detected dummy/fake placeholder in production code.',
      });
    }
    if (mockAssignmentRegex.test(content)) {
      violations.push({
        file: rel,
        rule: 'no-mock-in-production',
        message: 'Detected mock data assignment in production source file.',
      });
    }
  }
  return violations;
}

export async function checkCircularDependencies(
  root: string,
  files: string[],
): Promise<GovernanceViolation[]> {
  const violations: GovernanceViolation[] = [];
  const graph = new Map<string, string[]>();

  for (const rel of files) {
    const content = await readFile(join(root, rel), 'utf8');
    const importRegex = /(?:import|from)\s+['"](\.[^'"]+)['"]/g;
    const deps: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = importRegex.exec(content)) !== null) {
      const dir = dirname(join(root, rel));
      let resolved = relative(root, resolve(dir, match[1])).replace(/\.js$/, '.ts');
      if (!resolved.endsWith('.ts')) resolved = `${resolved}.ts`;
      deps.push(resolved);
    }
    graph.set(rel, deps);
  }

  const visited = new Set<string>();
  const inStack = new Set<string>();

  function dfs(node: string, path: string[]): boolean {
    visited.add(node);
    inStack.add(node);
    for (const dep of graph.get(node) ?? []) {
      if (!visited.has(dep)) {
        if (dfs(dep, [...path, dep])) return true;
      } else if (inStack.has(dep)) {
        violations.push({
          file: node,
          rule: 'circular-dependency',
          message: `Circular dependency detected: ${[...path, dep].join(' -> ')}`,
        });
        return true;
      }
    }
    inStack.delete(node);
    return false;
  }

  for (const file of files) {
    if (!visited.has(file)) dfs(file, [file]);
  }
  return violations;
}

export async function checkContractsSsot(
  root: string,
  files: string[],
): Promise<GovernanceViolation[]> {
  const violations: GovernanceViolation[] = [];
  for (const rel of files) {
    if (!rel.startsWith('packages/contracts/')) continue;
    const content = await readFile(join(root, rel), 'utf8');
    if (/@palnadu\/(api|persistence|server-config)/.test(content)) {
      violations.push({
        file: rel,
        rule: 'contracts-ssot-violation',
        message:
          'packages/contracts must not import from higher-level packages (strict leaf package).',
      });
    }
  }
  return violations;
}

export async function validateGovernance(root: string): Promise<GovernanceViolation[]> {
  const files = await getTrackedFiles(root);
  return [
    ...(await checkFileLimits(root, files)),
    ...checkNaming(files),
    ...(await checkSecrets(root, files)),
    ...(await checkProhibitedPatterns(root, files)),
    ...(await checkCircularDependencies(root, files)),
    ...(await checkContractsSsot(root, files)),
  ];
}

const scriptPath = process.argv[1] === undefined ? '' : resolve(process.argv[1]);
if (scriptPath === fileURLToPath(import.meta.url)) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const violations = await validateGovernance(repositoryRoot);
  if (violations.length > 0) {
    console.error(`Found ${violations.length} engineering governance violation(s):`);
    for (const v of violations) console.error(`  - [${v.rule}] ${v.file}: ${v.message}`);
    process.exit(1);
  }
  console.info('Engineering governance checks passed successfully.');
}
