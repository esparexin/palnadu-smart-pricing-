import console from 'node:console';
import { dirname, resolve } from 'node:path';
import { argv, exit } from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  checkCircularDependencies,
  checkContractsSsot,
  checkFileLimits,
  checkNaming,
  checkProhibitedPatterns,
  checkSecrets,
  getTrackedFiles,
  JUSTIFIED_FILE_SIZE_EXCEPTIONS,
  validateGovernance,
} from './check-governance.ts';

export {
  checkCircularDependencies,
  checkContractsSsot,
  checkFileLimits,
  checkNaming,
  checkProhibitedPatterns,
  checkSecrets,
  getTrackedFiles,
  JUSTIFIED_FILE_SIZE_EXCEPTIONS,
  validateGovernance,
};

const scriptPath = argv[1] === undefined ? '' : resolve(argv[1]);
if (scriptPath === fileURLToPath(import.meta.url)) {
  const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const violations = await validateGovernance(repositoryRoot);
  if (violations.length > 0) {
    console.error(`Found ${violations.length} engineering governance violation(s):`);
    for (const v of violations) {
      console.error(`  - [${v.rule}] ${v.file}: ${v.message}`);
    }
    exit(1);
  }
  console.info('Engineering governance checks passed successfully.');
}
