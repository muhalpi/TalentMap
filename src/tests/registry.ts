import type {
  ScoreOutput,
  TestCatalogItem,
  TestDefinition,
  TestKey,
} from "./shared/types";
import { bfiDefinition } from "./instruments/bfi/definition";
import { mbtiDefinition } from "./instruments/mbti/definition";

function plannedInstrument(
  key: Exclude<TestKey, "mbti" | "bfi">,
  name: string,
  estimatedMinutes: number,
): TestDefinition {
  return {
    key,
    name,
    version: "pending-adaptation",
    description: "Repository analysis pending. This instrument is reserved in the platform registry.",
    estimatedMinutes,
    implemented: false,
    questions: [],
    score: (): ScoreOutput => {
      throw new Error(`${name} has not been adapted into TalentMap yet.`);
    },
  };
}

export const testRegistry: Record<TestKey, TestDefinition> = {
  mbti: mbtiDefinition,
  kts2: plannedInstrument("kts2", "KTS-II Questionnaire", 15),
  mmpi: plannedInstrument("mmpi", "MMPI", 60),
  bfi: bfiDefinition,
  sds: plannedInstrument("sds", "Self-Directed Search", 25),
  papi: plannedInstrument("papi", "PAPI", 25),
  disc: plannedInstrument("disc", "DISC Assessment", 12),
};

export const testCatalog: TestCatalogItem[] = Object.values(testRegistry).map(
  (test) => ({
    key: test.key,
    name: test.name,
    version: test.version,
    description: test.description,
    estimatedMinutes: test.estimatedMinutes,
    implemented: test.implemented,
  }),
);

export function getTestDefinition(testKey: string) {
  return testRegistry[testKey as TestKey];
}

export function isCurrentImplementedTest(
  testKey: string,
  version: string,
) {
  const definition = getTestDefinition(testKey);

  return Boolean(
    definition?.implemented && definition.version === version,
  );
}

export function currentImplementedTestRows<
  T extends { testKey: string; version: string },
>(rows: T[]) {
  return rows.filter((row) =>
    isCurrentImplementedTest(row.testKey, row.version),
  );
}
