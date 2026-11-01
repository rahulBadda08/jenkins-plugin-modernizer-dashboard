import { isSafeShellArg, SHELL_ADVISORY_HEADER } from '../../domain/security';
import type { EnrichedPlugin } from '../../domain/types';

export interface ScriptGenerationOptions {
  timestamp?: string;
}

/**
 * Pure generator function to compile a bash automation script for a set of target plugins.
 * Guarantees that invalid or unsafe identifiers are NEVER interpolated into executable script content.
 */
export function generateMasterScript(
  plugins: EnrichedPlugin[],
  targetNames: string[],
  options: ScriptGenerationOptions = {}
): string {
  const timestamp = options.timestamp || new Date().toISOString();
  const pluginMap = new Map<string, EnrichedPlugin>();
  for (const p of plugins) {
    pluginMap.set(p.pluginName, p);
  }

  const lines: string[] = [
    '#!/usr/bin/env bash',
    `# AUTOMATED MODERNIZATION RECIPES - GENERATED: ${timestamp}`,
    SHELL_ADVISORY_HEADER,
    '',
    'set -euo pipefail',
    '',
  ];

  for (const name of targetNames) {
    if (!isSafeShellArg(name)) {
      lines.push(
        '# -----------------------------------------------------------------------------',
        '# SKIPPED: An invalid or unsafe plugin identifier was omitted.',
        '# No command was generated for this entry to prevent shell command injection.',
        '# -----------------------------------------------------------------------------',
        ''
      );
      continue;
    }

    const plugin = pluginMap.get(name);
    const commands = plugin?.insight?.surgical?.commands || [
      '# No remediation commands registered for this plugin.',
    ];

    lines.push(
      '# =============================================================================',
      `# Target Plugin: ${name}`,
      '# ============================================================================='
    );
    for (const cmd of commands) {
      lines.push(cmd);
    }
    lines.push('');
  }

  return lines.join('\n');
}
