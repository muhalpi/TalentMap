import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

/**
 * Guards what the participant's browser is given.
 *
 * `participant-test-runner.tsx` is a client component, so every module it imports
 * for a VALUE is compiled into the JavaScript the participant downloads. A DISC
 * instrument module would take the item bank with it, and that bank is the answer
 * key: each of the 112 adjectives carries its dimension and its Most/Least scoring
 * keys. Anyone holding a test token could then read the keying out of devtools and
 * choose words to produce whatever profile they wanted, which is a scoring
 * integrity problem rather than a bundle-size one.
 *
 * Type-only imports are erased by the compiler and carry nothing, so they are
 * skipped here exactly as they are by the bundler.
 *
 * This walks the source graph rather than a built chunk on purpose: it needs no
 * build step, so it fails in the same run as the change that introduces the
 * import.
 */

const projectRoot = process.cwd();
const clientEntry = "src/components/test/participant-test-runner.tsx";

/**
 * An import statement, or a bare side-effect import. Import lists span lines but
 * never contain a semicolon, so `[^;]` is a safe stopping point, and the full
 * matched text is what tells a type-only import from a value one.
 */
const importPattern =
  /(?:import|export)\s+[^;]*?from\s*["']([^"']+)["']|import\s*["']([^"']+)["']/g;

function readSource(repoRelativePath: string): string {
  const absolute = path.join(projectRoot, repoRelativePath);

  assert.ok(
    existsSync(absolute),
    `${repoRelativePath} not found - run the tests from the repository root`,
  );

  return readFileSync(absolute, "utf8");
}

/** Resolves an import the way the bundler does, or null for a package import. */
function resolveSpecifier(
  fromFile: string,
  specifier: string,
): string | null {
  const base = specifier.startsWith("@/")
    ? path.posix.join("src", specifier.slice(2))
    : specifier.startsWith(".")
      ? path.posix.join(path.posix.dirname(fromFile), specifier)
      : null;

  if (base === null) {
    // react, next/*, lucide-react, node:*: not ours, and none of them can reach
    // an instrument module.
    return null;
  }

  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}/index.ts`,
    `${base}/index.tsx`,
  ]) {
    if (
      /\.tsx?$/.test(candidate) &&
      existsSync(path.join(projectRoot, candidate))
    ) {
      return candidate;
    }
  }

  assert.fail(`${fromFile} imports ${specifier}, which does not resolve`);
}

/** Every module reachable from `entry` through value imports, entry included. */
function valueImportGraph(entry: string): string[] {
  const seen = new Set<string>([entry]);
  const queue = [entry];

  while (queue.length > 0) {
    const current = queue.shift() as string;
    const source = readSource(current);

    for (const match of source.matchAll(importPattern)) {
      // `import type ... from` and `export type ... from` are erased, so they add
      // nothing to the bundle.
      if (/^(?:import|export)\s+type\b/.test(match[0])) {
        continue;
      }

      const resolved = resolveSpecifier(current, match[1] ?? match[2]);

      if (resolved !== null && !seen.has(resolved)) {
        seen.add(resolved);
        queue.push(resolved);
      }
    }
  }

  return [...seen];
}

test("keeps the instrument item banks out of the participant runner's bundle", () => {
  const source = readSource(clientEntry);

  // If this ever stops being a client component the reasoning above changes, so
  // the guard states its own premise.
  assert.match(source, /^"use client";/, `${clientEntry} must be a client entry`);

  const graph = valueImportGraph(clientEntry);

  // A scanner that resolved nothing would pass every assertion below, so pin a
  // few modules that must be in the graph.
  for (const expected of [
    "src/components/test/forced-choice-group-table.tsx",
    "src/components/test/answer-instruction.ts",
    "src/components/test/draft-resume.ts",
    "src/components/test/forced-choice-screen.ts",
    "src/tests/shared/forced-choice.ts",
    // The DISC result surface and the two shared report components it renders.
    // These are the modules most likely to reach for the instrument - the report
    // prints per-pattern copy and the figure prints dimension names and segment
    // bands - so naming them here makes the scan provably cover them rather than
    // leaving it to the generic rule below.
    "src/components/test/disc-participant-result.tsx",
    "src/components/results/disc-profile-report.tsx",
    "src/components/results/disc-graph.tsx",
  ]) {
    assert.ok(graph.includes(expected), `${expected} should be in the graph`);
  }

  // The only instrument modules a participant screen may pull in are the score
  // type guards, which hold no items and no keying. questions.ts, terms.ts,
  // profiles.ts, scoring.ts, segments.ts and definition.ts must never appear.
  const instrumentModules = graph
    .filter((module) => module.startsWith("src/tests/instruments/"))
    .filter((module) => path.posix.basename(module) !== "result.ts");

  assert.deepEqual(
    instrumentModules,
    [],
    "a participant client component reached an instrument's item bank",
  );

  // The generic rule above would also be satisfied by an alias, so name the two
  // files that actually carry the DISC answer key.
  for (const banned of [
    "src/tests/instruments/disc/terms.ts",
    "src/tests/instruments/disc/questions.ts",
    "src/tests/instruments/disc/profiles.ts",
  ]) {
    assert.ok(!graph.includes(banned), `${banned} must not reach the browser`);
  }
});
