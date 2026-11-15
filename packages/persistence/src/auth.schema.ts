import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
};

export const adminUsers = pgTable(
  'admin_users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    email: text('email').notNull(),
    name: text('name').notNull(),
    passwordHash: text('password_hash').notNull(),
    status: text('status').default('active').notNull(),
    permissions: jsonb('permissions').$type<string[]>().default([]).notNull(),
    ...timestamps,
  },
  (table) => [
    check('admin_users_status_ck', sql`${table.status} in ('active', 'suspended')`),
    check('admin_users_email_nonblank_ck', sql`length(btrim(${table.email})) > 0`),
    check('admin_users_name_nonblank_ck', sql`length(btrim(${table.name})) > 0`),
    check('admin_users_password_hash_nonblank_ck', sql`length(btrim(${table.passwordHash})) > 0`),
    check('admin_users_permissions_array_ck', sql`jsonb_typeof(${table.permissions}) = 'array'`),
    uniqueIndex('admin_users_normalized_email_uq').on(sql`lower(btrim(${table.email}))`),
    index('admin_users_status_idx').on(table.status),
  ],
);

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    sessionTokenHash: text('session_token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      'admin_sessions_token_hash_nonblank_ck',
      sql`length(btrim(${table.sessionTokenHash})) > 0`,
    ),
    uniqueIndex('admin_sessions_token_hash_uq').on(table.sessionTokenHash),
    index('admin_sessions_user_id_idx').on(table.userId),
    index('admin_sessions_expires_at_idx').on(table.expiresAt),
  ],
);
