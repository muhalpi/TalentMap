import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const clientStatusEnum = pgEnum("client_status", [
  "active",
  "suspended",
  "expired",
]);

export const adminRoleEnum = pgEnum("admin_role", ["admin", "owner"]);

export const clientUserRoleEnum = pgEnum("client_user_role", [
  "client_admin",
  "analyst",
  "viewer",
]);

export const tokenStatusEnum = pgEnum("token_status", [
  "active",
  "in_progress",
  "completed",
  "expired",
]);

export const retentionStatusEnum = pgEnum("retention_status", [
  "active",
  "flagged_for_deletion",
  "deleted",
]);

export const resultSourceEnum = pgEnum("result_source", [
  "platform_assessment",
  "xlsx_import",
]);

export const participantStatusEnum = pgEnum("participant_status", [
  "active",
  "archived",
  "anonymized",
]);

export const participantFieldTypeEnum = pgEnum("participant_field_type", [
  "text",
  "long_text",
  "number",
  "date",
  "email",
  "phone",
  "select",
  "multi_select",
  "boolean",
]);

export const internalAdminUsers = pgTable("internal_admin_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name"),
  role: adminRoleEnum("role").notNull().default("admin"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const clients = pgTable(
  "clients",
  {
    clientId: uuid("client_id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    status: clientStatusEnum("status").notNull().default("active"),
    contractStartsAt: timestamp("contract_starts_at", {
      withTimezone: true,
    }).notNull(),
    contractEndsAt: timestamp("contract_ends_at", {
      withTimezone: true,
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "clients_contract_window",
      sql`${table.contractEndsAt} >= ${table.contractStartsAt}`,
    ),
  ],
);

export const clientUsers = pgTable(
  "client_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    email: text("email").notNull(),
    name: text("name"),
    role: clientUserRoleEnum("role").notNull().default("client_admin"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("client_users_client_email_unique").on(
      table.clientId,
      table.email,
    ),
    index("client_users_client_idx").on(table.clientId),
  ],
);

export const tests = pgTable(
  "tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    testKey: text("test_key").notNull(),
    displayName: text("display_name").notNull(),
    version: text("version").notNull(),
    isEnabled: boolean("is_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("tests_client_key_version_unique").on(
      table.clientId,
      table.testKey,
      table.version,
    ),
    index("tests_client_idx").on(table.clientId),
  ],
);

export const clientTestQuotas = pgTable(
  "client_test_quotas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "cascade" }),
    quotaTotal: integer("quota_total").notNull(),
    quotaUsed: integer("quota_used").notNull().default(0),
    quotaReserved: integer("quota_reserved").notNull().default(0),
    quotaConsumed: integer("quota_consumed").notNull().default(0),
    quotaExpiresAt: timestamp("quota_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("client_test_quotas_client_test_unique").on(
      table.clientId,
      table.testId,
    ),
    check("client_test_quotas_total_positive", sql`${table.quotaTotal} >= 0`),
    check("client_test_quotas_used_non_negative", sql`${table.quotaUsed} >= 0`),
    check(
      "client_test_quotas_reserved_non_negative",
      sql`${table.quotaReserved} >= 0`,
    ),
    check(
      "client_test_quotas_consumed_non_negative",
      sql`${table.quotaConsumed} >= 0`,
    ),
    check(
      "client_test_quotas_used_lte_total",
      sql`${table.quotaUsed} <= ${table.quotaTotal}`,
    ),
    check(
      "client_test_quotas_reserved_consumed_lte_total",
      sql`${table.quotaReserved} + ${table.quotaConsumed} <= ${table.quotaTotal}`,
    ),
  ],
);

export const participantFieldDefinitions = pgTable(
  "participant_field_definitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    fieldKey: text("field_key").notNull(),
    label: text("label").notNull(),
    fieldType: participantFieldTypeEnum("field_type").notNull(),
    options: jsonb("options")
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    isRequired: boolean("is_required").notNull().default(false),
    isSearchable: boolean("is_searchable").notNull().default(true),
    isSensitive: boolean("is_sensitive").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    displayOrder: integer("display_order").notNull().default(0),
    createdByClientUserId: uuid("created_by_client_user_id").references(
      () => clientUsers.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("participant_field_definitions_client_key_unique").on(
      table.clientId,
      table.fieldKey,
    ),
    index("participant_field_definitions_client_active_order_idx").on(
      table.clientId,
      table.isActive,
      table.displayOrder,
    ),
    check(
      "participant_field_definitions_key_format",
      sql`${table.fieldKey} ~ '^[a-z][a-z0-9_]{0,62}$'`,
    ),
    check(
      "participant_field_definitions_display_order_non_negative",
      sql`${table.displayOrder} >= 0`,
    ),
    check(
      "participant_field_definitions_options_array",
      sql`jsonb_typeof(${table.options}) = 'array'`,
    ),
  ],
);

export const participants = pgTable(
  "participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    employeeId: text("employee_id"),
    externalReference: text("external_reference"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    status: participantStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    anonymizedAt: timestamp("anonymized_at", { withTimezone: true }),
  },
  (table) => [
    index("participants_client_idx").on(table.clientId),
    uniqueIndex("participants_client_email_unique")
      .on(table.clientId, table.email)
      .where(sql`${table.email} is not null`),
    uniqueIndex("participants_client_employee_id_unique")
      .on(table.clientId, table.employeeId)
      .where(sql`${table.employeeId} is not null`),
    uniqueIndex("participants_client_external_reference_unique")
      .on(table.clientId, table.externalReference)
      .where(sql`${table.externalReference} is not null`),
  ],
);

export const participantTokens = pgTable(
  "participant_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "restrict" }),
    testKey: text("test_key").notNull(),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    tokenHash: text("token_hash").notNull().unique(),
    tokenPreview: text("token_preview"),
    accessVersion: integer("access_version").notNull().default(1),
    participantReference: text("participant_reference"),
    status: tokenStatusEnum("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    lastActivityAt: timestamp("last_activity_at", { withTimezone: true }),
    createdByClientUserId: uuid("created_by_client_user_id").references(
      () => clientUsers.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("participant_tokens_client_status_idx").on(
      table.clientId,
      table.status,
    ),
    index("participant_tokens_client_participant_idx").on(
      table.clientId,
      table.participantId,
    ),
    index("participant_tokens_client_test_idx").on(
      table.clientId,
      table.testId,
    ),
    uniqueIndex("participant_tokens_live_participant_test_key_unique")
      .on(table.clientId, table.participantId, table.testKey)
      .where(
        sql`${table.participantId} is not null and ${table.status} in ('active', 'in_progress')`,
      ),
    index("participant_tokens_expires_idx").on(table.expiresAt),
  ],
);

export const participantConsents = pgTable(
  "participant_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    tokenId: uuid("token_id")
      .notNull()
      .references(() => participantTokens.id, { onDelete: "restrict" }),
    consentVersion: text("consent_version").notNull(),
    consentTextSnapshot: text("consent_text_snapshot").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("participant_consents_client_idx").on(table.clientId),
    index("participant_consents_participant_idx").on(table.participantId),
    uniqueIndex("participant_consents_token_unique").on(table.tokenId),
  ],
);

export const participantAnswerDrafts = pgTable(
  "participant_answer_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    tokenId: uuid("token_id")
      .notNull()
      .references(() => participantTokens.id, { onDelete: "cascade" }),
    answersJson: jsonb("answers_json")
      .$type<Record<string, unknown>>()
      .notNull(),
    questionTimingsJson: jsonb("question_timings_json")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    currentQuestionIndex: integer("current_question_index")
      .notNull()
      .default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("participant_answer_drafts_token_unique").on(table.tokenId),
    index("participant_answer_drafts_client_idx").on(table.clientId),
    index("participant_answer_drafts_participant_idx").on(table.participantId),
  ],
);

export const participantAnonymizationAudits = pgTable(
  "participant_anonymization_audits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "restrict" }),
    requestedByClientUserId: uuid("requested_by_client_user_id").references(
      () => clientUsers.id,
      { onDelete: "set null" },
    ),
    anonymizedLabel: text("anonymized_label").notNull(),
    reason: text("reason"),
    tokensExpired: integer("tokens_expired").notNull().default(0),
    reservationsReleased: integer("reservations_released").notNull().default(0),
    draftsDeleted: integer("drafts_deleted").notNull().default(0),
    consentsScrubbed: integer("consents_scrubbed").notNull().default(0),
    resultsUnlinked: integer("results_unlinked").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("participant_anonymization_audits_client_idx").on(table.clientId),
    index("participant_anonymization_audits_participant_idx").on(
      table.participantId,
    ),
    index("participant_anonymization_audits_requested_by_idx").on(
      table.requestedByClientUserId,
    ),
    check(
      "participant_anonymization_audits_tokens_expired_non_negative",
      sql`${table.tokensExpired} >= 0`,
    ),
    check(
      "participant_anonymization_audits_reservations_released_non_negative",
      sql`${table.reservationsReleased} >= 0`,
    ),
    check(
      "participant_anonymization_audits_drafts_deleted_non_negative",
      sql`${table.draftsDeleted} >= 0`,
    ),
    check(
      "participant_anonymization_audits_consents_scrubbed_non_negative",
      sql`${table.consentsScrubbed} >= 0`,
    ),
    check(
      "participant_anonymization_audits_results_unlinked_non_negative",
      sql`${table.resultsUnlinked} >= 0`,
    ),
  ],
);

export const testRateLimitBuckets = pgTable(
  "test_rate_limit_buckets",
  {
    keyHash: text("key_hash").primaryKey(),
    tokenHash: text("token_hash").notNull(),
    ipHash: text("ip_hash").notNull(),
    routeScope: text("route_scope").notNull(),
    requestCount: integer("request_count").notNull().default(1),
    windowStart: timestamp("window_start", { withTimezone: true })
      .notNull()
      .defaultNow(),
    windowEndsAt: timestamp("window_ends_at", { withTimezone: true }).notNull(),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    lastRequestAt: timestamp("last_request_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("test_rate_limit_buckets_token_idx").on(table.tokenHash),
    index("test_rate_limit_buckets_ip_idx").on(table.ipHash),
    index("test_rate_limit_buckets_window_ends_idx").on(table.windowEndsAt),
    check(
      "test_rate_limit_buckets_request_count_positive",
      sql`${table.requestCount} >= 0`,
    ),
  ],
);

export const results = pgTable(
  "results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.clientId, { onDelete: "cascade" }),
    testId: uuid("test_id")
      .notNull()
      .references(() => tests.id, { onDelete: "restrict" }),
    tokenId: uuid("token_id")
      .unique()
      .references(() => participantTokens.id, { onDelete: "restrict" }),
    participantId: uuid("participant_id").references(() => participants.id, {
      onDelete: "set null",
    }),
    source: resultSourceEnum("source").notNull().default("platform_assessment"),
    importedByClientUserId: uuid("imported_by_client_user_id").references(
      () => clientUsers.id,
      { onDelete: "set null" },
    ),
    importedFileName: text("imported_file_name"),
    importedAt: timestamp("imported_at", { withTimezone: true }),
    rawAnswers: jsonb("raw_answers").$type<Record<string, string>>().notNull(),
    questionTimings: jsonb("question_timings")
      .$type<Record<string, number>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    scoredResult: jsonb("scored_result")
      .$type<Record<string, unknown>>()
      .notNull(),
    scoreSummary: jsonb("score_summary").$type<Record<string, unknown>>(),
    interpretation: jsonb("interpretation").$type<Record<string, unknown>>(),
    submittedAt: timestamp("submitted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    retentionUntil: timestamp("retention_until", {
      withTimezone: true,
    }).notNull(),
    retentionStatus: retentionStatusEnum("retention_status")
      .notNull()
      .default("active"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("results_client_test_idx").on(table.clientId, table.testId),
    index("results_client_participant_idx").on(
      table.clientId,
      table.participantId,
    ),
    index("results_client_source_idx").on(table.clientId, table.source),
    index("results_imported_by_idx").on(table.importedByClientUserId),
    index("results_retention_idx").on(
      table.retentionUntil,
      table.retentionStatus,
    ),
    check(
      "results_duration_seconds_non_negative",
      sql`${table.durationSeconds} >= 0`,
    ),
    check(
      "results_source_integrity",
      sql`(${table.source} = 'platform_assessment' and ${table.tokenId} is not null) or (${table.source} = 'xlsx_import' and ${table.tokenId} is null and ${table.importedAt} is not null)`,
    ),
  ],
);

export const clientsRelations = relations(clients, ({ many }) => ({
  users: many(clientUsers),
  tests: many(tests),
  participants: many(participants),
  participantFieldDefinitions: many(participantFieldDefinitions),
  tokens: many(participantTokens),
  participantConsents: many(participantConsents),
  participantAnswerDrafts: many(participantAnswerDrafts),
  participantAnonymizationAudits: many(participantAnonymizationAudits),
  results: many(results),
}));

export const testsRelations = relations(tests, ({ one, many }) => ({
  client: one(clients, {
    fields: [tests.clientId],
    references: [clients.clientId],
  }),
  quotas: many(clientTestQuotas),
  tokens: many(participantTokens),
  results: many(results),
}));

export const participantsRelations = relations(
  participants,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [participants.clientId],
      references: [clients.clientId],
    }),
    tokens: many(participantTokens),
    consents: many(participantConsents),
    answerDrafts: many(participantAnswerDrafts),
    anonymizationAudits: many(participantAnonymizationAudits),
    results: many(results),
  }),
);

export const participantFieldDefinitionsRelations = relations(
  participantFieldDefinitions,
  ({ one }) => ({
    client: one(clients, {
      fields: [participantFieldDefinitions.clientId],
      references: [clients.clientId],
    }),
    createdByClientUser: one(clientUsers, {
      fields: [participantFieldDefinitions.createdByClientUserId],
      references: [clientUsers.id],
    }),
  }),
);

export const participantTokensRelations = relations(
  participantTokens,
  ({ one, many }) => ({
    client: one(clients, {
      fields: [participantTokens.clientId],
      references: [clients.clientId],
    }),
    test: one(tests, {
      fields: [participantTokens.testId],
      references: [tests.id],
    }),
    participant: one(participants, {
      fields: [participantTokens.participantId],
      references: [participants.id],
    }),
    result: one(results, {
      fields: [participantTokens.id],
      references: [results.tokenId],
    }),
    consents: many(participantConsents),
    answerDraft: one(participantAnswerDrafts, {
      fields: [participantTokens.id],
      references: [participantAnswerDrafts.tokenId],
    }),
  }),
);

export const participantConsentsRelations = relations(
  participantConsents,
  ({ one }) => ({
    client: one(clients, {
      fields: [participantConsents.clientId],
      references: [clients.clientId],
    }),
    participant: one(participants, {
      fields: [participantConsents.participantId],
      references: [participants.id],
    }),
    token: one(participantTokens, {
      fields: [participantConsents.tokenId],
      references: [participantTokens.id],
    }),
  }),
);

export const participantAnswerDraftsRelations = relations(
  participantAnswerDrafts,
  ({ one }) => ({
    client: one(clients, {
      fields: [participantAnswerDrafts.clientId],
      references: [clients.clientId],
    }),
    participant: one(participants, {
      fields: [participantAnswerDrafts.participantId],
      references: [participants.id],
    }),
    token: one(participantTokens, {
      fields: [participantAnswerDrafts.tokenId],
      references: [participantTokens.id],
    }),
  }),
);

export const participantAnonymizationAuditsRelations = relations(
  participantAnonymizationAudits,
  ({ one }) => ({
    client: one(clients, {
      fields: [participantAnonymizationAudits.clientId],
      references: [clients.clientId],
    }),
    participant: one(participants, {
      fields: [participantAnonymizationAudits.participantId],
      references: [participants.id],
    }),
    requestedByClientUser: one(clientUsers, {
      fields: [participantAnonymizationAudits.requestedByClientUserId],
      references: [clientUsers.id],
    }),
  }),
);

export const resultsRelations = relations(results, ({ one }) => ({
  client: one(clients, {
    fields: [results.clientId],
    references: [clients.clientId],
  }),
  test: one(tests, {
    fields: [results.testId],
    references: [tests.id],
  }),
  token: one(participantTokens, {
    fields: [results.tokenId],
    references: [participantTokens.id],
  }),
  participant: one(participants, {
    fields: [results.participantId],
    references: [participants.id],
  }),
  importedByClientUser: one(clientUsers, {
    fields: [results.importedByClientUserId],
    references: [clientUsers.id],
  }),
}));
