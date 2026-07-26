import type { DiscDimensionCode, DiscGraphKey } from "./types";

// Norming tables for the licensed 28-group forced-choice DISC instrument,
// transcribed from the operator's `results` table (columns: dimension,
// intensity, value, segment, graph). The source names the three graphs
// numerically; this module uses the TalentMap names throughout:
//
//   graph1 -> "public"     scored from the MOST tallies
//   graph2 -> "private"    scored from the LEAST tallies
//   graph3 -> "perceived"  scored from the change scores (Most - Least)
//
// What the source actually norms is the per-(graph, dimension) mapping from a
// raw VALUE to an INTENSITY of 1-28. The segment is not independently normed:
//
//   segment === Math.ceil(intensity / 4)
//
// held for ALL 202 rows of the source table, with no exception - segment 1 spans
// intensity 1-4, segment 2 spans 5-8, 3 spans 9-12, 4 spans 13-16, 5 spans
// 17-20, 6 spans 21-24, and 7 spans 25-28. So intensity is the primary quantity
// and segment is derived from it, which is why this module stores intensity and
// computes the segment rather than the other way round.
//
// Keeping the intensity is what makes the report's graphs plottable: a point's
// height is its intensity on a 1-28 axis, so two dimensions sitting in the same
// segment still plot at different heights (intensity 13 and intensity 16 are
// both segment 4). A segment-only table cannot position a point.
//
// Three properties of the source are deliberate and must be preserved:
//
// 1. "private" (graph2) is INVERTED. A low LEAST tally means the respondent
//    rarely rejected that dimension, which the source reads as a HIGH intensity,
//    so intensity 28 holds the lowest tallies and intensity 1 the highest. Do
//    not normalise this away.
//
// 2. The conversion differs per dimension, and the midlines are not symmetric
//    about zero. On "perceived", intensity 14 (segment 4) is a change score of
//    -7 for D but +1 for C. Never substitute a shared or symmetric scheme.
//
// 3. Not every intensity from 1 to 28 is reachable on every dimension. The
//    source lists only the intensities it norms - 14 of the 28 for public/D,
//    24 for perceived/D - and public/D bottoms out at intensity 3 rather than 1.
//    That sparseness is the instrument's, not a transcription loss.
//
// The source's 202 rows become 200 bands: in graph2/D and graph3/D one intensity
// is listed against two adjacent values (intensity 27 for a Least tally of 1 or
// 2, intensity 23 for a change score of 2 or 3), and each of those pairs is one
// band spanning both values.
//
// The source rows are sparse in VALUE as well: it lists, for example, no row
// between a change score of 9 and 27 on perceived/D. Each row's value is read as
// the first value of its band, so a band runs from its own value up to one below
// the next row's value, and the two outermost bands are opened to -Infinity and
// +Infinity so that every arithmetically reachable score resolves. No such gap
// in the source straddles a segment boundary, so this reading cannot move a
// value into a different segment than the source's own segment column gives it.

export interface DiscIntensityBand {
  /** 1-28. The plotted height of the point on a graph. */
  intensity: number;
  /** Inclusive. -Infinity on the lowest band of each row. */
  min: number;
  /** Inclusive. Infinity on the highest band of each row. */
  max: number;
}

/**
 * Raw value -> intensity, per graph and dimension.
 *
 * Bands are listed in ascending VALUE order, which for "private" means the
 * intensity column runs downwards. Bands within a row are contiguous and
 * non-overlapping and together cover the whole number line.
 */
export const discIntensityBands: Record<
  DiscGraphKey,
  Record<DiscDimensionCode, DiscIntensityBand[]>
> = {
  // graph1 - MOST tallies. Value ascends with intensity.
  public: {
    D: [
      { intensity: 3, min: -Infinity, max: 0 },
      { intensity: 6, min: 1, max: 1 },
      { intensity: 9, min: 2, max: 2 },
      { intensity: 12, min: 3, max: 3 },
      { intensity: 14, min: 4, max: 4 },
      { intensity: 16, min: 5, max: 5 },
      { intensity: 19, min: 6, max: 6 },
      { intensity: 20, min: 7, max: 7 },
      { intensity: 22, min: 8, max: 8 },
      { intensity: 23, min: 9, max: 9 },
      { intensity: 24, min: 10, max: 10 },
      { intensity: 25, min: 11, max: 11 },
      { intensity: 26, min: 12, max: 26 },
      { intensity: 28, min: 27, max: Infinity },
    ],
    I: [
      { intensity: 1, min: -Infinity, max: 0 },
      { intensity: 2, min: 1, max: 1 },
      { intensity: 3, min: 2, max: 2 },
      { intensity: 4, min: 3, max: 3 },
      { intensity: 7, min: 4, max: 4 },
      { intensity: 10, min: 5, max: 5 },
      { intensity: 11, min: 6, max: 6 },
      { intensity: 13, min: 7, max: 7 },
      { intensity: 15, min: 8, max: 8 },
      { intensity: 17, min: 9, max: 9 },
      { intensity: 19, min: 10, max: 10 },
      { intensity: 21, min: 11, max: 11 },
      { intensity: 23, min: 12, max: 12 },
      { intensity: 25, min: 13, max: 13 },
      { intensity: 26, min: 14, max: 25 },
      { intensity: 28, min: 26, max: Infinity },
    ],
    S: [
      { intensity: 1, min: -Infinity, max: 0 },
      { intensity: 2, min: 1, max: 1 },
      { intensity: 4, min: 2, max: 2 },
      { intensity: 7, min: 3, max: 3 },
      { intensity: 10, min: 4, max: 4 },
      { intensity: 13, min: 5, max: 5 },
      { intensity: 16, min: 6, max: 6 },
      { intensity: 19, min: 7, max: 7 },
      { intensity: 21, min: 8, max: 8 },
      { intensity: 23, min: 9, max: 9 },
      { intensity: 24, min: 10, max: 10 },
      { intensity: 26, min: 11, max: 11 },
      { intensity: 27, min: 12, max: 23 },
      { intensity: 28, min: 24, max: Infinity },
    ],
    C: [
      { intensity: 1, min: -Infinity, max: 0 },
      { intensity: 2, min: 1, max: 1 },
      { intensity: 4, min: 2, max: 2 },
      { intensity: 6, min: 3, max: 3 },
      { intensity: 9, min: 4, max: 4 },
      { intensity: 12, min: 5, max: 5 },
      { intensity: 14, min: 6, max: 6 },
      { intensity: 16, min: 7, max: 7 },
      { intensity: 20, min: 8, max: 8 },
      { intensity: 22, min: 9, max: 9 },
      { intensity: 23, min: 10, max: 10 },
      { intensity: 25, min: 11, max: 11 },
      { intensity: 26, min: 12, max: 27 },
      { intensity: 28, min: 28, max: Infinity },
    ],
  },
  // graph2 - LEAST tallies. INVERTED at source: the intensity column
  // DESCENDS as the raw Least tally rises, so the lowest tally carries
  // intensity 28 and segment 7. Transcribed as-is; do not normalise.
  private: {
    D: [
      { intensity: 28, min: -Infinity, max: 0 },
      { intensity: 27, min: 1, max: 2 },
      { intensity: 26, min: 3, max: 3 },
      { intensity: 25, min: 4, max: 4 },
      { intensity: 24, min: 5, max: 5 },
      { intensity: 22, min: 6, max: 6 },
      { intensity: 21, min: 7, max: 7 },
      { intensity: 19, min: 8, max: 8 },
      { intensity: 18, min: 9, max: 9 },
      { intensity: 14, min: 10, max: 10 },
      { intensity: 12, min: 11, max: 11 },
      { intensity: 11, min: 12, max: 12 },
      { intensity: 9, min: 13, max: 13 },
      { intensity: 7, min: 14, max: 14 },
      { intensity: 5, min: 15, max: 15 },
      { intensity: 4, min: 16, max: 16 },
      { intensity: 3, min: 17, max: 26 },
      { intensity: 1, min: 27, max: Infinity },
    ],
    I: [
      { intensity: 28, min: -Infinity, max: 0 },
      { intensity: 26, min: 1, max: 1 },
      { intensity: 22, min: 2, max: 2 },
      { intensity: 19, min: 3, max: 3 },
      { intensity: 15, min: 4, max: 4 },
      { intensity: 12, min: 5, max: 5 },
      { intensity: 9, min: 6, max: 6 },
      { intensity: 7, min: 7, max: 7 },
      { intensity: 5, min: 8, max: 8 },
      { intensity: 4, min: 9, max: 9 },
      { intensity: 3, min: 10, max: 26 },
      { intensity: 1, min: 27, max: Infinity },
    ],
    S: [
      { intensity: 28, min: -Infinity, max: 0 },
      { intensity: 27, min: 1, max: 1 },
      { intensity: 26, min: 2, max: 2 },
      { intensity: 25, min: 3, max: 3 },
      { intensity: 24, min: 4, max: 4 },
      { intensity: 22, min: 5, max: 5 },
      { intensity: 20, min: 6, max: 6 },
      { intensity: 16, min: 7, max: 7 },
      { intensity: 14, min: 8, max: 8 },
      { intensity: 11, min: 9, max: 9 },
      { intensity: 8, min: 10, max: 10 },
      { intensity: 6, min: 11, max: 11 },
      { intensity: 4, min: 12, max: 12 },
      { intensity: 3, min: 13, max: 25 },
      { intensity: 1, min: 26, max: Infinity },
    ],
    C: [
      { intensity: 28, min: -Infinity, max: 0 },
      { intensity: 26, min: 1, max: 1 },
      { intensity: 25, min: 2, max: 2 },
      { intensity: 23, min: 3, max: 3 },
      { intensity: 20, min: 4, max: 4 },
      { intensity: 16, min: 5, max: 5 },
      { intensity: 12, min: 6, max: 6 },
      { intensity: 10, min: 7, max: 7 },
      { intensity: 7, min: 8, max: 8 },
      { intensity: 4, min: 9, max: 9 },
      { intensity: 3, min: 10, max: 25 },
      { intensity: 1, min: 26, max: Infinity },
    ],
  },
  // graph3 - CHANGE scores (Most - Least). Value ascends with intensity,
  // and the midline sits at a different raw value on every dimension.
  perceived: {
    D: [
      { intensity: 1, min: -Infinity, max: -17 },
      { intensity: 3, min: -16, max: -16 },
      { intensity: 4, min: -15, max: -15 },
      { intensity: 6, min: -14, max: -14 },
      { intensity: 7, min: -13, max: -13 },
      { intensity: 8, min: -12, max: -12 },
      { intensity: 9, min: -11, max: -11 },
      { intensity: 10, min: -10, max: -10 },
      { intensity: 11, min: -9, max: -9 },
      { intensity: 12, min: -8, max: -8 },
      { intensity: 14, min: -7, max: -7 },
      { intensity: 15, min: -6, max: -6 },
      { intensity: 16, min: -5, max: -5 },
      { intensity: 17, min: -4, max: -4 },
      { intensity: 18, min: -3, max: -3 },
      { intensity: 19, min: -2, max: -2 },
      { intensity: 20, min: -1, max: -1 },
      { intensity: 21, min: 0, max: 0 },
      { intensity: 22, min: 1, max: 1 },
      { intensity: 23, min: 2, max: 4 },
      { intensity: 24, min: 5, max: 5 },
      { intensity: 25, min: 6, max: 8 },
      { intensity: 26, min: 9, max: 26 },
      { intensity: 28, min: 27, max: Infinity },
    ],
    I: [
      { intensity: 1, min: -Infinity, max: -8 },
      { intensity: 3, min: -7, max: -6 },
      { intensity: 4, min: -5, max: -5 },
      { intensity: 5, min: -4, max: -4 },
      { intensity: 6, min: -3, max: -3 },
      { intensity: 7, min: -2, max: -2 },
      { intensity: 8, min: -1, max: -1 },
      { intensity: 9, min: 0, max: 0 },
      { intensity: 11, min: 1, max: 1 },
      { intensity: 12, min: 2, max: 2 },
      { intensity: 13, min: 3, max: 3 },
      { intensity: 14, min: 4, max: 4 },
      { intensity: 15, min: 5, max: 5 },
      { intensity: 17, min: 6, max: 6 },
      { intensity: 19, min: 7, max: 7 },
      { intensity: 20, min: 8, max: 8 },
      { intensity: 21, min: 9, max: 9 },
      { intensity: 23, min: 10, max: 10 },
      { intensity: 24, min: 11, max: 11 },
      { intensity: 25, min: 12, max: 13 },
      { intensity: 27, min: 14, max: 25 },
      { intensity: 28, min: 26, max: Infinity },
    ],
    S: [
      { intensity: 1, min: -Infinity, max: -12 },
      { intensity: 2, min: -11, max: -10 },
      { intensity: 4, min: -9, max: -9 },
      { intensity: 5, min: -8, max: -8 },
      { intensity: 7, min: -7, max: -7 },
      { intensity: 8, min: -6, max: -6 },
      { intensity: 9, min: -5, max: -5 },
      { intensity: 11, min: -4, max: -4 },
      { intensity: 12, min: -3, max: -3 },
      { intensity: 15, min: -2, max: -2 },
      { intensity: 16, min: -1, max: -1 },
      { intensity: 18, min: 0, max: 0 },
      { intensity: 19, min: 1, max: 1 },
      { intensity: 20, min: 2, max: 2 },
      { intensity: 21, min: 3, max: 3 },
      { intensity: 23, min: 4, max: 4 },
      { intensity: 24, min: 5, max: 5 },
      { intensity: 25, min: 6, max: 17 },
      { intensity: 27, min: 18, max: 23 },
      { intensity: 28, min: 24, max: Infinity },
    ],
    C: [
      { intensity: 1, min: -Infinity, max: -9 },
      { intensity: 3, min: -8, max: -7 },
      { intensity: 4, min: -6, max: -6 },
      { intensity: 6, min: -5, max: -5 },
      { intensity: 7, min: -4, max: -4 },
      { intensity: 8, min: -3, max: -3 },
      { intensity: 9, min: -2, max: -2 },
      { intensity: 11, min: -1, max: -1 },
      { intensity: 12, min: 0, max: 0 },
      { intensity: 14, min: 1, max: 1 },
      { intensity: 16, min: 2, max: 2 },
      { intensity: 17, min: 3, max: 3 },
      { intensity: 19, min: 4, max: 4 },
      { intensity: 20, min: 5, max: 5 },
      { intensity: 22, min: 6, max: 6 },
      { intensity: 24, min: 7, max: 7 },
      { intensity: 25, min: 8, max: 8 },
      { intensity: 26, min: 9, max: 27 },
      { intensity: 28, min: 28, max: Infinity },
    ],
  },
};

/**
 * Resolves a raw graph value to its intensity (1..28) for one dimension.
 *
 * Every row covers the whole number line, so the loop always finds a band. The
 * fallback exists only to satisfy the return type and to fail loudly rather than
 * silently returning a plausible-looking intensity if a band table were ever
 * edited into an incomplete state.
 */
export function discIntensityFor(
  graph: DiscGraphKey,
  code: DiscDimensionCode,
  value: number,
): number {
  const bands = discIntensityBands[graph][code];

  for (const band of bands) {
    if (value >= band.min && value <= band.max) {
      return band.intensity;
    }
  }

  throw new Error(
    `DISC intensity table for ${graph}/${code} does not cover value ${value}.`,
  );
}

/**
 * Intensity (1..28) -> segment (1..7), in bands of four.
 *
 * This is the universal relation `ceil(intensity / 4)`, which held for all 202
 * rows of the source table. The clamp guards the boundaries rather than
 * implementing anything: an intensity of 0 or below would otherwise give segment
 * 0 or negative, and one above 28 would give segment 8.
 */
export function discSegmentForIntensity(intensity: number): number {
  const segment = Math.ceil(intensity / 4);

  if (segment < 1) {
    return 1;
  }

  if (segment > 7) {
    return 7;
  }

  return segment;
}

/**
 * Resolves a raw graph value to its segment (1..7) for one dimension.
 *
 * Kept as the module's headline helper because callers and tests use it. It is
 * now a composition: the value becomes an intensity through the instrument's own
 * conversion table, and the segment is that intensity in bands of four.
 */
export function discSegmentFor(
  graph: DiscGraphKey,
  code: DiscDimensionCode,
  value: number,
): number {
  return discSegmentForIntensity(discIntensityFor(graph, code, value));
}

export interface DiscSegmentBand {
  segment: number;
  min: number;
  max: number;
}

/**
 * Value -> segment, DERIVED from `discIntensityBands` by merging adjacent
 * intensity bands that share a segment.
 *
 * Nothing is normed here and nothing is transcribed here - this is a view over
 * the intensity table, and it exists to be asserted against. Merging the table
 * this way is what makes "every row covers segments 1 to 7 exactly once, with no
 * gap and no overlap, across the whole number line" a statement that can be
 * checked at all; `scoring.test.ts` checks it, and it would not hold if a
 * transcribed band were dropped, duplicated, or put out of order. Because
 * intensity moves monotonically with value in every row, each segment forms a
 * single contiguous run, so every row comes out as exactly seven bands. For
 * "private" the segments run downwards as the value rises, the same inversion the
 * intensity table carries.
 *
 * It is deliberately NOT what draws the shaded band on a graph. `disc-graph.tsx`
 * derives that arithmetically from `ceil(intensity / 4)`, because it cannot
 * import this module: a value import of an instrument module from a component the
 * participant surface can reach would put the conversion tables, and through them
 * the item bank, into the browser bundle.
 */
export const discSegmentBands: Record<
  DiscGraphKey,
  Record<DiscDimensionCode, DiscSegmentBand[]>
> = (() => {
  const graphs: DiscGraphKey[] = ["public", "private", "perceived"];
  const codes: DiscDimensionCode[] = ["D", "I", "S", "C"];
  const table = {} as Record<
    DiscGraphKey,
    Record<DiscDimensionCode, DiscSegmentBand[]>
  >;

  for (const graph of graphs) {
    table[graph] = {} as Record<DiscDimensionCode, DiscSegmentBand[]>;

    for (const code of codes) {
      const merged: DiscSegmentBand[] = [];

      for (const band of discIntensityBands[graph][code]) {
        const segment = discSegmentForIntensity(band.intensity);
        const last = merged[merged.length - 1];

        if (last !== undefined && last.segment === segment) {
          last.max = band.max;
          continue;
        }

        merged.push({ segment, min: band.min, max: band.max });
      }

      table[graph][code] = merged;
    }
  }

  return table;
})();
