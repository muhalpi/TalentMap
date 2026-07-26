import type { PublicTestOption } from "@/tests/shared/types";

import type { BfiTraitKey } from "./types";

export interface BfiQuestionDefinition {
  id: string;
  no: number;
  prompt: string;
  trait: BfiTraitKey;
  reverse: boolean;
}

export const bfiResponseOptions: PublicTestOption[] = [
  { value: "1", label: "Very inaccurate" },
  { value: "2", label: "Moderately inaccurate" },
  { value: "3", label: "Neither accurate nor inaccurate" },
  { value: "4", label: "Moderately accurate" },
  { value: "5", label: "Very accurate" },
];

// TalentMap plain-English adaptation of the public-domain 50-item IPIP
// representation of the lexical Big Five markers. Item order, trait mapping,
// and positive/reverse scoring follow the published source.
// Canonical questionnaire and keys: https://ipip.ori.org/new_ipip-50-item-scale.htm
export const bfiQuestions: BfiQuestionDefinition[] = [
  { id: "1", no: 1, prompt: "I am the life of the party.", trait: "extraversion", reverse: false },
  { id: "2", no: 2, prompt: "I do not feel much concern for others.", trait: "agreeableness", reverse: true },
  { id: "3", no: 3, prompt: "I am always prepared.", trait: "conscientiousness", reverse: false },
  { id: "4", no: 4, prompt: "I get stressed easily.", trait: "emotionalStability", reverse: true },
  { id: "5", no: 5, prompt: "I have a rich vocabulary.", trait: "opennessIntellect", reverse: false },
  { id: "6", no: 6, prompt: "I do not talk much.", trait: "extraversion", reverse: true },
  { id: "7", no: 7, prompt: "I am interested in other people.", trait: "agreeableness", reverse: false },
  { id: "8", no: 8, prompt: "I leave my belongings lying around.", trait: "conscientiousness", reverse: true },
  { id: "9", no: 9, prompt: "I am relaxed most of the time.", trait: "emotionalStability", reverse: false },
  { id: "10", no: 10, prompt: "I have difficulty understanding abstract ideas.", trait: "opennessIntellect", reverse: true },
  { id: "11", no: 11, prompt: "I feel comfortable around other people.", trait: "extraversion", reverse: false },
  { id: "12", no: 12, prompt: "I insult other people.", trait: "agreeableness", reverse: true },
  { id: "13", no: 13, prompt: "I pay attention to details.", trait: "conscientiousness", reverse: false },
  { id: "14", no: 14, prompt: "I worry about things.", trait: "emotionalStability", reverse: true },
  { id: "15", no: 15, prompt: "I have a vivid imagination.", trait: "opennessIntellect", reverse: false },
  { id: "16", no: 16, prompt: "I tend to stay in the background.", trait: "extraversion", reverse: true },
  { id: "17", no: 17, prompt: "I sympathize with other people's feelings.", trait: "agreeableness", reverse: false },
  { id: "18", no: 18, prompt: "I make a mess of things.", trait: "conscientiousness", reverse: true },
  { id: "19", no: 19, prompt: "I rarely feel sad.", trait: "emotionalStability", reverse: false },
  { id: "20", no: 20, prompt: "I am not interested in abstract ideas.", trait: "opennessIntellect", reverse: true },
  { id: "21", no: 21, prompt: "I start conversations.", trait: "extraversion", reverse: false },
  { id: "22", no: 22, prompt: "I am not interested in other people's problems.", trait: "agreeableness", reverse: true },
  { id: "23", no: 23, prompt: "I complete tasks right away.", trait: "conscientiousness", reverse: false },
  { id: "24", no: 24, prompt: "I am easily unsettled.", trait: "emotionalStability", reverse: true },
  { id: "25", no: 25, prompt: "I come up with excellent ideas.", trait: "opennessIntellect", reverse: false },
  { id: "26", no: 26, prompt: "I usually have little to say.", trait: "extraversion", reverse: true },
  { id: "27", no: 27, prompt: "I am compassionate toward other people.", trait: "agreeableness", reverse: false },
  { id: "28", no: 28, prompt: "I often forget to put things back where they belong.", trait: "conscientiousness", reverse: true },
  { id: "29", no: 29, prompt: "I get upset easily.", trait: "emotionalStability", reverse: true },
  { id: "30", no: 30, prompt: "I do not have a good imagination.", trait: "opennessIntellect", reverse: true },
  { id: "31", no: 31, prompt: "I talk to many different people at social gatherings.", trait: "extraversion", reverse: false },
  { id: "32", no: 32, prompt: "I am not very interested in other people.", trait: "agreeableness", reverse: true },
  { id: "33", no: 33, prompt: "I prefer things to be orderly.", trait: "conscientiousness", reverse: false },
  { id: "34", no: 34, prompt: "I experience frequent changes in my mood.", trait: "emotionalStability", reverse: true },
  { id: "35", no: 35, prompt: "I understand new things quickly.", trait: "opennessIntellect", reverse: false },
  { id: "36", no: 36, prompt: "I do not like drawing attention to myself.", trait: "extraversion", reverse: true },
  { id: "37", no: 37, prompt: "I make time for other people.", trait: "agreeableness", reverse: false },
  { id: "38", no: 38, prompt: "I avoid my responsibilities.", trait: "conscientiousness", reverse: true },
  { id: "39", no: 39, prompt: "I have frequent mood swings.", trait: "emotionalStability", reverse: true },
  { id: "40", no: 40, prompt: "I use complex words.", trait: "opennessIntellect", reverse: false },
  { id: "41", no: 41, prompt: "I am comfortable being the center of attention.", trait: "extraversion", reverse: false },
  { id: "42", no: 42, prompt: "I can sense other people's emotions.", trait: "agreeableness", reverse: false },
  { id: "43", no: 43, prompt: "I follow a schedule.", trait: "conscientiousness", reverse: false },
  { id: "44", no: 44, prompt: "I get irritated easily.", trait: "emotionalStability", reverse: true },
  { id: "45", no: 45, prompt: "I spend time reflecting on things.", trait: "opennessIntellect", reverse: false },
  { id: "46", no: 46, prompt: "I am quiet around strangers.", trait: "extraversion", reverse: true },
  { id: "47", no: 47, prompt: "I make other people feel at ease.", trait: "agreeableness", reverse: false },
  { id: "48", no: 48, prompt: "I have high standards for my work.", trait: "conscientiousness", reverse: false },
  { id: "49", no: 49, prompt: "I often feel sad.", trait: "emotionalStability", reverse: true },
  { id: "50", no: 50, prompt: "I am full of ideas.", trait: "opennessIntellect", reverse: false },
];
