export type TestKey =
  | "mbti"
  | "kts2"
  | "mmpi"
  | "bfi"
  | "sds"
  | "papi"
  | "disc";

export type AnswerMap = Record<string, string>;

export interface PublicTestOption {
  value: string;
  label: string;
}

export interface PublicTestQuestion {
  id: string;
  no: number;
  prompt: string;
  options: PublicTestOption[];
}

export interface ScoreOutput {
  summary: Record<string, unknown>;
  result: Record<string, unknown>;
  interpretation?: Record<string, unknown>;
}

export interface TestDefinition<TScore extends ScoreOutput = ScoreOutput> {
  key: TestKey;
  name: string;
  version: string;
  description: string;
  estimatedMinutes: number;
  implemented: boolean;
  questions: PublicTestQuestion[];
  score: (answers: AnswerMap) => TScore;
}

export interface TestCatalogItem {
  key: TestKey;
  name: string;
  version: string;
  description: string;
  estimatedMinutes: number;
  implemented: boolean;
}
