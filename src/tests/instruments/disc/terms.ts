import type { DiscDimensionCode } from "./types";

// The 112-adjective item bank for the 28-group forced-choice DISC instrument
// supplied by the platform operator.
//
// PROVENANCE - two different things are recorded in this file and they do NOT
// have the same standing. Read this before changing anything here.
//
// TRANSCRIBED (authoritative, do not re-derive or reorder):
//   - the 112 adjectives themselves
//   - which group each adjective belongs to
//   - the within-group display order, so position A is always the first word the
//     respondent sees
//   - the asymmetric keying structure: the thirteen (group, dimension) slots that
//     score on one side only
//   - the segment band tables in ./segments.ts
//
// DERIVED (reviewed, but not transcribed - re-verify against the operator's key):
//   - which of the four adjectives in a group carries D, which I, which S and
//     which C.
//
// The reason for the split: the operator's SQL export stores the adjectives as
// the placeholders 'term1'..'term112' and keys the exceptions by (group number,
// dimension), so it fixes the shape of the keying without recording which word
// sits in which dimension. The words came from screenshots of the running app,
// which show the groups but not the keying. The mapping below is therefore the
// one part of the instrument that was reconstructed rather than copied.
//
// How it was reconstructed, and how to check it:
//   1. Each group must be a bijection onto {D, I, S, C} - that is fixed by the
//      source. In most groups three of the four words are unmistakable, so the
//      fourth is forced by elimination (for example G20 Assertive is plainly D,
//      which forces Confident to I).
//   2. Where two words were both plausible on the same dimension, the word was
//      placed with the cluster the rest of the bank already establishes for that
//      dimension. See the notes on groups 25 and 26 below, which are the two
//      closest calls in the bank.
// A single word moved between two dimensions can change a respondent's reported
// pattern, so scoring.test.ts pins all 112 assignments verbatim: a change here
// shows up as an explicit, reviewable diff rather than a silent rescoring.
//
// KNOWN OPEN QUESTION - group numbering. The exception slots are keyed to the
// group numbers in the operator's SQL, while the words and their order come from
// app screenshots, and the one screenshot that shows numbered groups does not
// present them in the same order as the SQL rows. The group *membership* is
// corroborated (the same four-word sets appear), so only the numbering is at
// risk; if the two numberings turn out to disagree, the thirteen asymmetric
// slots move to different groups. Note that the reachable maxima are invariant
// under such a remapping, so the maxima assertions cannot detect it. Settling
// this needs the operator's own scoring key.
//
// A null mostKey or leastKey means the term does not score on that side: picking
// it there adds nothing to any tally. Thirteen of the 112 terms are keyed this
// way, which is why the Most and Least tallies do not sum to 28 and why the
// change scores do not sum to zero. That asymmetry is part of the instrument's
// norming - the reachable maxima it produces (Most: D 27, I 26, S 24, C 28;
// Least: D 27, I 27, S 26, C 26) match the published segment tables exactly.
// Those maxima depend only on the transcribed keying structure, not on the
// derived word-to-dimension mapping.

export type DiscTermPosition = "A" | "B" | "C" | "D";

export interface DiscTerm {
  position: DiscTermPosition;
  term: string;
  dimension: DiscDimensionCode;
  mostKey: DiscDimensionCode | null;
  leastKey: DiscDimensionCode | null;
}

export interface DiscTermGroup {
  group: number;
  terms: DiscTerm[];
}

export const discTermPositions: DiscTermPosition[] = ["A", "B", "C", "D"];

export const discTermGroups: DiscTermGroup[] = [
  {
    group: 1,
    terms: [
      { position: "A", term: "Cheerful", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "B", term: "Reserved", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "C", term: "Obliging", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Strong-willed", dimension: "D", mostKey: "D", leastKey: "D" },
    ],
  },
  {
    group: 2,
    terms: [
      { position: "A", term: "Firm", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "B", term: "Playful", dimension: "I", mostKey: "I", leastKey: null },
      { position: "C", term: "Obedient", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Fussy", dimension: "C", mostKey: "C", leastKey: "C" },
    ],
  },
  {
    group: 3,
    terms: [
      { position: "A", term: "Dominant", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "B", term: "Conscientious", dimension: "C", mostKey: "C", leastKey: null },
      { position: "C", term: "Responsive", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Expressive", dimension: "I", mostKey: null, leastKey: "I" },
    ],
  },
  {
    group: 4,
    terms: [
      { position: "A", term: "Compliant", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "B", term: "Captivating", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "C", term: "Demanding", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "D", term: "Contented", dimension: "S", mostKey: "S", leastKey: "S" },
    ],
  },
  {
    group: 5,
    terms: [
      { position: "A", term: "Poised", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "B", term: "Modest", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "C", term: "Observant", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "D", term: "Impatient", dimension: "D", mostKey: "D", leastKey: "D" },
    ],
  },
  {
    group: 6,
    terms: [
      { position: "A", term: "Predictable", dimension: "S", mostKey: null, leastKey: "S" },
      { position: "B", term: "Stubborn", dimension: "D", mostKey: null, leastKey: "D" },
      { position: "C", term: "Introspective", dimension: "C", mostKey: "C", leastKey: null },
      { position: "D", term: "Attractive", dimension: "I", mostKey: "I", leastKey: "I" },
    ],
  },
  {
    group: 7,
    terms: [
      { position: "A", term: "Cautious", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "B", term: "Good Natured", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "C", term: "Determined", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "D", term: "Convincing", dimension: "I", mostKey: null, leastKey: "I" },
    ],
  },
  {
    group: 8,
    terms: [
      { position: "A", term: "Helpful", dimension: "S", mostKey: "S", leastKey: null },
      { position: "B", term: "Pioneering", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "C", term: "Respectful", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "D", term: "Optimistic", dimension: "I", mostKey: "I", leastKey: "I" },
    ],
  },
  {
    group: 9,
    terms: [
      { position: "A", term: "Neighborly", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "B", term: "Careful", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "C", term: "Appealing", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "D", term: "Restless", dimension: "D", mostKey: "D", leastKey: "D" },
    ],
  },
  {
    group: 10,
    terms: [
      { position: "A", term: "Original", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "B", term: "Gentle", dimension: "S", mostKey: null, leastKey: "S" },
      { position: "C", term: "Humble", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "D", term: "Persuasive", dimension: "I", mostKey: "I", leastKey: "I" },
    ],
  },
  {
    group: 11,
    terms: [
      { position: "A", term: "Jovial", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "B", term: "Precise", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "C", term: "Even-tempered", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Direct", dimension: "D", mostKey: "D", leastKey: "D" },
    ],
  },
  {
    group: 12,
    terms: [
      { position: "A", term: "Bold", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "B", term: "Loyal", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "C", term: "Charming", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "D", term: "Logical", dimension: "C", mostKey: "C", leastKey: "C" },
    ],
  },
  {
    group: 13,
    terms: [
      { position: "A", term: "Impulsive", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "B", term: "Forceful", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "C", term: "Easy-going", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Introverted", dimension: "C", mostKey: "C", leastKey: "C" },
    ],
  },
  {
    group: 14,
    terms: [
      { position: "A", term: "Perceptive", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "B", term: "Independent", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "C", term: "Stimulating", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "D", term: "Kind", dimension: "S", mostKey: "S", leastKey: "S" },
    ],
  },
  {
    group: 15,
    terms: [
      { position: "A", term: "Light-hearted", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "B", term: "Argumentative", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "C", term: "Systematic", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "D", term: "Cooperative", dimension: "S", mostKey: "S", leastKey: null },
    ],
  },
  {
    group: 16,
    terms: [
      { position: "A", term: "Aggressive", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "B", term: "Fearful", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "C", term: "Amiable", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Extroverted", dimension: "I", mostKey: "I", leastKey: "I" },
    ],
  },
  {
    group: 17,
    terms: [
      { position: "A", term: "Adventurous", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "B", term: "Insightful", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "C", term: "Out-going", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "D", term: "Moderate", dimension: "S", mostKey: "S", leastKey: "S" },
    ],
  },
  {
    group: 18,
    terms: [
      { position: "A", term: "Refined", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "B", term: "Good mixer", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "C", term: "Vigorous", dimension: "D", mostKey: "D", leastKey: null },
      { position: "D", term: "Lenient", dimension: "S", mostKey: "S", leastKey: "S" },
    ],
  },
  {
    group: 19,
    terms: [
      { position: "A", term: "Generous", dimension: "S", mostKey: null, leastKey: "S" },
      { position: "B", term: "Animated", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "C", term: "Persistent", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "D", term: "Well-disciplined", dimension: "C", mostKey: "C", leastKey: "C" },
    ],
  },
  {
    group: 20,
    terms: [
      { position: "A", term: "Sympathetic", dimension: "S", mostKey: null, leastKey: "S" },
      { position: "B", term: "Confident", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "C", term: "Impartial", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "D", term: "Assertive", dimension: "D", mostKey: "D", leastKey: "D" },
    ],
  },
  {
    group: 21,
    terms: [
      { position: "A", term: "Magnetic", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "B", term: "Agreeable", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "C", term: "Insistent", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "D", term: "Tactful", dimension: "C", mostKey: "C", leastKey: "C" },
    ],
  },
  {
    group: 22,
    terms: [
      { position: "A", term: "Outspoken", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "B", term: "Calm", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "C", term: "Friendly", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "D", term: "Accurate", dimension: "C", mostKey: "C", leastKey: "C" },
    ],
  },
  {
    group: 23,
    terms: [
      { position: "A", term: "Competitive", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "B", term: "Private", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "C", term: "Joyful", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "D", term: "Considerate", dimension: "S", mostKey: "S", leastKey: "S" },
    ],
  },
  {
    group: 24,
    terms: [
      { position: "A", term: "Sociable", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "B", term: "Self-reliant", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "C", term: "Patient", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Soft spoken", dimension: "C", mostKey: "C", leastKey: "C" },
    ],
  },
  // Group 25 - close call, reviewed and kept. Inspiring is I and Brave is D, so
  // Timid and Submissive split S and C. Submissive is held on S because Marston's
  // name for that factor was Submission, and Timid is held on C because the bank
  // already places the other fear-and-caution words on C (Fearful in G16,
  // Cautious in G07, Careful in G09).
  {
    group: 25,
    terms: [
      { position: "A", term: "Timid", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "B", term: "Submissive", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "C", term: "Inspiring", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "D", term: "Brave", dimension: "D", mostKey: "D", leastKey: "D" },
    ],
  },
  // Group 26 - close call, reviewed and corrected. Decisive is D and Talkative is
  // I, so Conventional and Controlled split S and C. Conventional goes to C: that
  // factor is defined by adherence to established standards, and the bank's other
  // rule-following words are already on C (Compliant G04, Respectful G08,
  // Systematic G15, Well-disciplined G19). Controlled goes to S, joining the
  // even-paced, restrained cluster the bank puts there (Even-tempered G11,
  // Easy-going G13, Moderate G17, Calm G22, Patient G24).
  {
    group: 26,
    terms: [
      { position: "A", term: "Conventional", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "B", term: "Decisive", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "C", term: "Controlled", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Talkative", dimension: "I", mostKey: "I", leastKey: "I" },
    ],
  },
  {
    group: 27,
    terms: [
      { position: "A", term: "Enthusiastic", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "B", term: "Daring", dimension: "D", mostKey: "D", leastKey: "D" },
      { position: "C", term: "Diplomatic", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "D", term: "Satisfied", dimension: "S", mostKey: "S", leastKey: "S" },
    ],
  },
  {
    group: 28,
    terms: [
      { position: "A", term: "Thorough", dimension: "C", mostKey: "C", leastKey: "C" },
      { position: "B", term: "High-spirited", dimension: "I", mostKey: "I", leastKey: "I" },
      { position: "C", term: "Willing", dimension: "S", mostKey: "S", leastKey: "S" },
      { position: "D", term: "Eager", dimension: "D", mostKey: "D", leastKey: "D" },
    ],
  },
];
