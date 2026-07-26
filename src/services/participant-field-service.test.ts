import assert from "node:assert/strict";
import test from "node:test";

import {
  buildParticipantMetadata,
  parseParticipantCustomFieldFormData,
  participantCustomFieldValues,
  type ParticipantFieldDefinitionDto,
} from "@/services/participant-field-service";

const definitions: ParticipantFieldDefinitionDto[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    fieldKey: "grade_level",
    label: "Grade level",
    fieldType: "select",
    options: ["Grade 7", "Grade 8"],
    isRequired: true,
    isSearchable: true,
    isSensitive: false,
    isActive: true,
    displayOrder: 0,
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    fieldKey: "activities",
    label: "Activities",
    fieldType: "multi_select",
    options: ["Sports", "Arts", "Science"],
    isRequired: false,
    isSearchable: true,
    isSensitive: false,
    isActive: true,
    displayOrder: 1,
  },
];

test("participant custom field form validates and normalizes structured values", () => {
  const formData = new FormData();
  formData.set("customField:grade_level", "Grade 8");
  formData.append("customField:activities", "Sports");
  formData.append("customField:activities", "Science");

  assert.deepEqual(parseParticipantCustomFieldFormData(definitions, formData), {
    values: {
      grade_level: "Grade 8",
      activities: ["Sports", "Science"],
    },
    fieldErrors: {},
  });
});

test("participant custom field form reports required and invalid choices", () => {
  const formData = new FormData();
  formData.set("customField:grade_level", "Grade 12");

  const parsed = parseParticipantCustomFieldFormData(definitions, formData);
  assert.deepEqual(parsed.values, {});
  assert.match(
    parsed.fieldErrors["customField:grade_level"]?.[0] ?? "",
    /not an available/i,
  );
});

test("legacy fixed metadata is readable until the migration moves it", () => {
  const legacyDefinition: ParticipantFieldDefinitionDto = {
    ...definitions[0]!,
    fieldKey: "department",
    label: "Department",
    fieldType: "text",
    options: [],
  };

  assert.deepEqual(
    participantCustomFieldValues({ department: "Student Affairs" }, [
      legacyDefinition,
    ]),
    { department: "Student Affairs" },
  );
});

test("participant metadata keeps tags separate from tenant fields", () => {
  assert.deepEqual(
    buildParticipantMetadata(["scholarship"], { grade_level: "Grade 8" }),
    {
      tags: ["scholarship"],
      customFields: { grade_level: "Grade 8" },
    },
  );
});
