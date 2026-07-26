import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  discIntensityFor,
  discSegmentFor,
  discSegmentForIntensity,
} from "./segments";
import type { DiscDimensionCode, DiscGraphKey } from "./types";

/**
 * Checks `segments.ts` against the instrument instead of against itself.
 *
 * The norming tables in `segments.ts` were transcribed from the `results` table
 * of the licensed instrument's own database dump. Every other test in this
 * directory reads those tables, so a transcription slip - one intensity typed as
 * 23 instead of 22, one band boundary off by one - would be invisible: the
 * contiguity, monotonicity and coverage checks would all still pass on a wrong
 * table, and every downstream expectation would simply be wrong together.
 *
 * So this file re-extracts the source rows and replays them. The 202 rows are
 * committed verbatim next to this file as `results-source.fixture.sql`, parsed
 * here by a regex written against the source DDL rather than against anything the
 * transcription produced, and each row is asserted to come back out of
 * `discIntensityFor`. That is the guard the rest of the suite cannot provide.
 *
 * The dump itself lives outside this repository, so it cannot be a test
 * dependency. When it IS present the fixture is additionally re-parsed from it
 * and compared row for row, which is what stops the committed copy drifting.
 */

/** Where the instrument's dump lives when it is checked out beside this repo. */
const sourceDumpPath =
  process.env.DISC_SOURCE_SQL ?? "C:/Users/alpi/Documents/GitHub/disc/db/disc.sql";

const fixturePath = "src/tests/instruments/disc/results-source.fixture.sql";

/** The source names its graphs 1, 2 and 3; TalentMap names them in words. */
const graphOfNumber: Record<string, DiscGraphKey> = {
  "1": "public",
  "2": "private",
  "3": "perceived",
};

const graphKeys: DiscGraphKey[] = ["public", "private", "perceived"];
const codes: DiscDimensionCode[] = ["D", "I", "S", "C"];

interface SourceRow {
  id: number;
  code: DiscDimensionCode;
  intensity: number;
  value: number;
  segment: number;
  graph: DiscGraphKey;
}

/**
 * One row of `INSERT INTO results VALUES`, as the source DDL declares it:
 * id INT, dimension CHAR(1), intensity INT, value INT, segment INT, graph TINYINT.
 * `value` is the only column that can be negative (a change score).
 */
const rowPattern =
  /^\((\d+),'([DISC])',(-?\d+),(-?\d+),(\d+),([123])\)[,;]$/;

function parseResultRows(text: string, origin: string): SourceRow[] {
  const rows: SourceRow[] = [];

  text.split(/\r?\n/).forEach((rawLine, index) => {
    const line = rawLine.trim();

    // Comment lines and the INSERT header carry no data. Anything else that
    // fails the pattern is a malformed row and must not be skipped quietly.
    if (line === "" || line.startsWith("--") || line.startsWith("INSERT")) {
      return;
    }

    const match = rowPattern.exec(line);

    assert.ok(
      match,
      `${origin} line ${index + 1} is not a results row: ${JSON.stringify(line)}`,
    );

    rows.push({
      id: Number(match[1]),
      code: match[2] as DiscDimensionCode,
      intensity: Number(match[3]),
      value: Number(match[4]),
      segment: Number(match[5]),
      graph: graphOfNumber[match[6]],
    });
  });

  return rows;
}

function readFixture(): SourceRow[] {
  const absolute = path.join(process.cwd(), fixturePath);

  assert.ok(
    existsSync(absolute),
    `${fixturePath} not found - run the tests from the repository root`,
  );

  return parseResultRows(readFileSync(absolute, "utf8"), fixturePath);
}

/** The dump's `results` rows, or null when the dump is not on this machine. */
function readSourceDump(): SourceRow[] | null {
  if (!existsSync(sourceDumpPath)) {
    return null;
  }

  const lines = readFileSync(sourceDumpPath, "utf8").split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim() === "INSERT INTO results VALUES",
  );

  assert.ok(
    start >= 0,
    `${sourceDumpPath} has no "INSERT INTO results VALUES" statement`,
  );

  const statement: string[] = [];

  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();

    if (line === "") {
      break;
    }

    statement.push(line);

    if (line.endsWith(";")) {
      break;
    }
  }

  return parseResultRows(statement.join("\n"), sourceDumpPath);
}

test("reproduces the source intensity for every one of the 202 rows", () => {
  const rows = readFixture();

  // The parse itself has to be checked, or a regex that quietly matched nothing
  // would turn this whole file into a no-op.
  assert.equal(rows.length, 202, "the source `results` table has 202 rows");
  assert.deepEqual(
    rows.map((row) => row.id),
    Array.from({ length: 202 }, (_, index) => index + 1),
    "the fixture must carry ids 1-202 in source order",
  );

  // Every graph/dimension pair is normed, and each is normed to this many rows.
  // Without this an accidentally truncated fixture would still pass row by row.
  const expectedRowCounts: Record<
    DiscGraphKey,
    Record<DiscDimensionCode, number>
  > = {
    public: { D: 14, I: 16, S: 14, C: 14 },
    private: { D: 19, I: 12, S: 15, C: 12 },
    perceived: { D: 25, I: 22, S: 20, C: 19 },
  };

  for (const graph of graphKeys) {
    for (const code of codes) {
      assert.equal(
        rows.filter((row) => row.graph === graph && row.code === code).length,
        expectedRowCounts[graph][code],
        `${graph}/${code} row count`,
      );
    }
  }

  // THE CHECK. Each row states what the instrument converts one raw value to on
  // one graph for one dimension; the transcription has to give that back.
  for (const row of rows) {
    assert.equal(
      discIntensityFor(row.graph, row.code, row.value),
      row.intensity,
      `row ${row.id}: ${row.graph}/${row.code} value ${row.value} must convert to intensity ${row.intensity}`,
    );

    // The source carries its own segment column. It equals ceil(intensity / 4)
    // on all 202 rows, which is why segments.ts derives the segment rather than
    // storing it - so assert the source's column, not the formula's own output.
    assert.equal(
      row.segment,
      Math.ceil(row.intensity / 4),
      `row ${row.id}: the source segment column is not ceil(intensity / 4)`,
    );
    assert.equal(
      discSegmentForIntensity(row.intensity),
      row.segment,
      `row ${row.id}: derived segment`,
    );
    assert.equal(
      discSegmentFor(row.graph, row.code, row.value),
      row.segment,
      `row ${row.id}: value ${row.value} must land in segment ${row.segment}`,
    );
  }

  // The two rows that share an intensity with their neighbour are the reason 202
  // source rows become 200 bands. Naming them keeps that merge deliberate: if a
  // third ever appeared, the band-count test in scoring.test.ts would fail and
  // this is where the explanation lives.
  const shared = rows.filter((row) =>
    rows.some(
      (other) =>
        other.id !== row.id &&
        other.graph === row.graph &&
        other.code === row.code &&
        other.intensity === row.intensity,
    ),
  );

  assert.deepEqual(
    shared
      .map(
        (row) =>
          `${row.graph}/${row.code} intensity ${row.intensity} value ${row.value}`,
      )
      // Sorted because the source lists its rows by descending intensity, so the
      // two values sharing one intensity appear in whichever order the dump has.
      .sort(),
    [
      "perceived/D intensity 23 value 2",
      "perceived/D intensity 23 value 3",
      "private/D intensity 27 value 1",
      "private/D intensity 27 value 2",
    ],
  );
});

test(
  "keeps the committed fixture identical to the instrument's own dump",
  { skip: existsSync(sourceDumpPath) ? false : `${sourceDumpPath} is not on this machine` },
  () => {
    const dumped = readSourceDump();

    assert.ok(dumped, "the dump was found but produced no rows");
    assert.deepEqual(
      readFixture(),
      dumped,
      "results-source.fixture.sql has drifted from the dump - re-extract it",
    );
  },
);

test("bands every intensity from 1 to 28 into a segment of four", () => {
  // segment === ceil(intensity / 4), stated exhaustively rather than as the
  // formula restated: 1-4 is segment 1, 5-8 is 2, and so on to 25-28 is 7.
  for (let intensity = 1; intensity <= 28; intensity += 1) {
    const segment = discSegmentForIntensity(intensity);

    assert.equal(segment, Math.ceil(intensity / 4), `intensity ${intensity}`);
    assert.ok(
      Number.isInteger(segment) && segment >= 1 && segment <= 7,
      `intensity ${intensity} produced segment ${segment}`,
    );
  }

  // Each of the seven segments takes exactly four of the 28 intensities, so no
  // band is wider or narrower than another.
  const perSegment = new Map<number, number>();

  for (let intensity = 1; intensity <= 28; intensity += 1) {
    const segment = discSegmentForIntensity(intensity);
    perSegment.set(segment, (perSegment.get(segment) ?? 0) + 1);
  }

  assert.deepEqual(
    [...perSegment.entries()].sort((left, right) => left[0] - right[0]),
    [
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 4],
      [5, 4],
      [6, 4],
      [7, 4],
    ],
  );
});

test("returns an intensity of 1 to 28 far beyond the source's own extremes", () => {
  // The source lists no row above a Most tally of 28 or below a change score of
  // -27, but a stored result written by another build, or an imported one, can
  // still carry anything. Every band row is open at both ends for that reason,
  // so nothing may fall off the table and produce NaN or undefined.
  const probes = [
    -1_000_000,
    -5_000,
    -200,
    -57,
    -29,
    -28,
    0,
    28,
    29,
    57,
    200,
    5_000,
    1_000_000,
  ];

  for (const graph of graphKeys) {
    for (const code of codes) {
      for (let value = -200; value <= 200; value += 1) {
        const intensity = discIntensityFor(graph, code, value);

        assert.ok(
          Number.isInteger(intensity) && intensity >= 1 && intensity <= 28,
          `${graph}/${code} value ${value} produced intensity ${intensity}`,
        );
      }

      for (const value of probes) {
        const intensity = discIntensityFor(graph, code, value);

        assert.ok(
          Number.isInteger(intensity) && intensity >= 1 && intensity <= 28,
          `${graph}/${code} value ${value} produced intensity ${intensity}`,
        );
      }

      // Past the ends of the table the answer stops moving, so an absurd value
      // saturates at the row's own extreme instead of extrapolating.
      assert.equal(
        discIntensityFor(graph, code, -1_000_000),
        discIntensityFor(graph, code, -5_000),
        `${graph}/${code} must clamp below the table`,
      );
      assert.equal(
        discIntensityFor(graph, code, 1_000_000),
        discIntensityFor(graph, code, 5_000),
        `${graph}/${code} must clamp above the table`,
      );
    }
  }
});

test("inverts the private graph, so a lower Least tally reads as a higher intensity", () => {
  for (const code of codes) {
    // Never rejected is the top of the graph; rejected in most groups is the
    // bottom. This is the source's own direction and must not be normalised.
    assert.equal(
      discIntensityFor("private", code, 0),
      28,
      `private/${code} at a Least tally of 0`,
    );
    assert.equal(
      discIntensityFor("private", code, 28),
      1,
      `private/${code} at a Least tally of 28`,
    );

    // And it falls the whole way, never rising, as the tally climbs.
    for (let value = -30; value < 30; value += 1) {
      assert.ok(
        discIntensityFor("private", code, value + 1) <=
          discIntensityFor("private", code, value),
        `private/${code} intensity rose between ${value} and ${value + 1}`,
      );
    }
  }

  // The other two graphs run the ordinary way round, which is what makes the
  // inversion worth pinning: a shared direction would be a transcription error.
  for (const graph of ["public", "perceived"] as const) {
    for (const code of codes) {
      for (let value = -30; value < 30; value += 1) {
        assert.ok(
          discIntensityFor(graph, code, value + 1) >=
            discIntensityFor(graph, code, value),
          `${graph}/${code} intensity fell between ${value} and ${value + 1}`,
        );
      }

      assert.ok(
        discIntensityFor(graph, code, 28) > discIntensityFor(graph, code, -28),
        `${graph}/${code} should not be inverted`,
      );
    }
  }
});
