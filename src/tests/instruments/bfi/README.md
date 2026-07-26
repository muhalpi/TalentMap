# Big Five Work Style Profile

TalentMap's `bfi` instrument implements the public-domain 50-item IPIP
representation of the lexical Big Five factor markers.

## Source and version

- Instrument: IPIP-BFM-50
- TalentMap version: `ipip-bfm-50-en-tm-1.1.0`
- Canonical questionnaire and scoring keys:
  <https://ipip.ori.org/new_ipip-50-item-scale.htm>
- IPIP permission statement: <https://ipip.ori.org/>
- Validated Indonesian translation available for a future localized version:
  <https://ipip.ori.org/IndonesianBFM.htm>

IPIP items and scales are in the public domain. This TalentMap version is a
plain-English adaptation: it adds an explicit first-person subject, expands
contractions, and replaces potentially unclear idioms or dated terms. Item
order, trait mapping, and the published positive/reverse scoring keys remain
unchanged. Because the displayed wording is adapted, this version should not
be described as a verbatim administration of the canonical IPIP questionnaire.

The user-provided `C:\Users\alpi\Documents\GitHub\bfi` repository was audited
as an implementation reference. Its committed code is MIT-licensed, but its
questionnaire records and result/scoring implementation are not present in the
repository. TalentMap therefore does not depend on its external database or
copy an unverifiable scoring routine from it.

## Scoring

- Responses range from 1 (`Very inaccurate`) to 5 (`Very accurate`).
- Negatively keyed items are scored as `6 - response`.
- Each of the five traits contains 10 items and has a raw range of 10–50.
- The report shows the mean item score and rescales the possible 1–5 range to
  0–100 with `(mean - 1) / 4 * 100`.
- The 0–100 value is a scale position, not a percentile or norm-group ranking.
- Lower, moderate, and higher labels divide the possible response scale into
  three descriptive bands. They are not diagnostic or normative cutoffs.

The report is intended for reflection, coaching, and development. It must not
be used as a clinical instrument or as the sole basis for employment decisions.
