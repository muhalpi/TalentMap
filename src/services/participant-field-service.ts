import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { participantFieldDefinitions } from "@/db/schema";

export type ParticipantFieldType =
  | "text"
  | "long_text"
  | "number"
  | "date"
  | "email"
  | "phone"
  | "select"
  | "multi_select"
  | "boolean";

export type ParticipantCustomFieldValue = string | number | boolean | string[];

export interface ParticipantFieldDefinitionDto {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: ParticipantFieldType;
  options: string[];
  isRequired: boolean;
  isSearchable: boolean;
  isSensitive: boolean;
  isActive: boolean;
  displayOrder: number;
}

export interface ParticipantMetadataDocument extends Record<string, unknown> {
  tags?: string[];
  customFields?: Record<string, ParticipantCustomFieldValue>;
}

export interface ParticipantFieldParseResult {
  value: ParticipantCustomFieldValue | null;
  error?: string;
}

export const participantFieldTypeLabels: Record<ParticipantFieldType, string> =
  {
    text: "Short text",
    long_text: "Long text",
    number: "Number",
    date: "Date",
    email: "Email",
    phone: "Phone",
    select: "Single choice",
    multi_select: "Multiple choice",
    boolean: "Yes / no",
  };

export const participantCustomFieldName = (fieldKey: string) =>
  `customField:${fieldKey}`;

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function isCustomFieldValue(
  value: unknown,
): value is ParticipantCustomFieldValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    (Array.isArray(value) && value.every((item) => typeof item === "string"))
  );
}

export function participantTags(metadata: Record<string, unknown> | null) {
  return stringArray(metadata?.tags);
}

export function participantCustomFieldValues(
  metadata: Record<string, unknown> | null,
  definitions: ParticipantFieldDefinitionDto[] = [],
) {
  const nested = metadata?.customFields;
  const values: Record<string, ParticipantCustomFieldValue> = {};

  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [key, value] of Object.entries(nested)) {
      if (isCustomFieldValue(value)) {
        values[key] = value;
      }
    }
  }

  // Compatibility for profiles created before custom field definitions existed.
  for (const definition of definitions) {
    const legacyValue = metadata?.[definition.fieldKey];
    if (!(definition.fieldKey in values) && isCustomFieldValue(legacyValue)) {
      values[definition.fieldKey] = legacyValue;
    }
  }

  return values;
}

export function buildParticipantMetadata(
  tags: string[],
  customFields: Record<string, ParticipantCustomFieldValue>,
): ParticipantMetadataDocument | null {
  const metadata: ParticipantMetadataDocument = {};
  if (tags.length) metadata.tags = tags;
  if (Object.keys(customFields).length) metadata.customFields = customFields;
  return Object.keys(metadata).length ? metadata : null;
}

export function parseParticipantTags(raw: string) {
  return [
    ...new Set(
      raw
        .split(/[;,]/)
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ].slice(0, 30);
}

function rawText(raw: unknown) {
  if (raw === null || raw === undefined) return "";
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  return String(raw).trim();
}

function blankResult(definition: ParticipantFieldDefinitionDto) {
  return definition.isRequired
    ? { value: null, error: `${definition.label} is required.` }
    : { value: null };
}

export function parseParticipantCustomFieldInput(
  definition: ParticipantFieldDefinitionDto,
  raw: unknown,
): ParticipantFieldParseResult {
  if (definition.fieldType === "multi_select") {
    const rawValues = Array.isArray(raw) ? raw : rawText(raw).split(/[;,]/);
    const values = [
      ...new Set(rawValues.map((value) => rawText(value)).filter(Boolean)),
    ];
    if (!values.length) return blankResult(definition);
    const invalid = values.find((value) => !definition.options.includes(value));
    return invalid
      ? {
          value: null,
          error: `${invalid} is not an available ${definition.label} option.`,
        }
      : { value: values };
  }

  if (definition.fieldType === "boolean") {
    if (typeof raw === "boolean") return { value: raw };
    const value = rawText(raw).toLowerCase();
    if (!value) return blankResult(definition);
    if (["true", "yes", "1", "on"].includes(value)) return { value: true };
    if (["false", "no", "0", "off"].includes(value)) return { value: false };
    return { value: null, error: `${definition.label} must be Yes or No.` };
  }

  const value = rawText(raw);
  if (!value) return blankResult(definition);

  if (definition.fieldType === "number") {
    const numberValue = Number(value);
    return Number.isFinite(numberValue)
      ? { value: numberValue }
      : { value: null, error: `${definition.label} must be a number.` };
  }

  if (definition.fieldType === "date") {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value))
      ? { value }
      : { value: null, error: `${definition.label} must use YYYY-MM-DD.` };
  }

  if (definition.fieldType === "email") {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 180
      ? { value: value.toLowerCase() }
      : { value: null, error: `${definition.label} must be a valid email.` };
  }

  if (definition.fieldType === "phone") {
    return /^[+()\d][+()\d\s.-]{4,39}$/.test(value)
      ? { value }
      : {
          value: null,
          error: `${definition.label} must be a valid phone number.`,
        };
  }

  if (definition.fieldType === "select") {
    return definition.options.includes(value)
      ? { value }
      : {
          value: null,
          error: `${value} is not an available ${definition.label} option.`,
        };
  }

  const maxLength = definition.fieldType === "long_text" ? 4_000 : 500;
  return value.length <= maxLength
    ? { value }
    : {
        value: null,
        error: `${definition.label} must contain at most ${maxLength.toLocaleString("en-US")} characters.`,
      };
}

export function parseParticipantCustomFieldFormData(
  definitions: ParticipantFieldDefinitionDto[],
  formData: FormData,
) {
  const values: Record<string, ParticipantCustomFieldValue> = {};
  const fieldErrors: Record<string, string[]> = {};

  for (const definition of definitions.filter((field) => field.isActive)) {
    const name = participantCustomFieldName(definition.fieldKey);
    const raw =
      definition.fieldType === "multi_select"
        ? formData.getAll(name)
        : formData.get(name);
    const parsed = parseParticipantCustomFieldInput(definition, raw);
    if (parsed.error) fieldErrors[name] = [parsed.error];
    if (parsed.value !== null) values[definition.fieldKey] = parsed.value;
  }

  return { values, fieldErrors };
}

export function participantFieldDisplayValue(
  value: ParticipantCustomFieldValue | undefined,
) {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function participantFieldKeyFromLabel(label: string) {
  const base = label
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 55);
  return /^[a-z]/.test(base) ? base : `field_${base || "custom"}`;
}

export async function getClientParticipantFieldDefinitions(
  clientId: string,
  options: { includeInactive?: boolean } = {},
): Promise<ParticipantFieldDefinitionDto[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: participantFieldDefinitions.id,
      fieldKey: participantFieldDefinitions.fieldKey,
      label: participantFieldDefinitions.label,
      fieldType: participantFieldDefinitions.fieldType,
      options: participantFieldDefinitions.options,
      isRequired: participantFieldDefinitions.isRequired,
      isSearchable: participantFieldDefinitions.isSearchable,
      isSensitive: participantFieldDefinitions.isSensitive,
      isActive: participantFieldDefinitions.isActive,
      displayOrder: participantFieldDefinitions.displayOrder,
    })
    .from(participantFieldDefinitions)
    .where(
      options.includeInactive
        ? eq(participantFieldDefinitions.clientId, clientId)
        : and(
            eq(participantFieldDefinitions.clientId, clientId),
            eq(participantFieldDefinitions.isActive, true),
          ),
    )
    .orderBy(
      asc(participantFieldDefinitions.displayOrder),
      asc(participantFieldDefinitions.label),
    );

  return rows;
}
