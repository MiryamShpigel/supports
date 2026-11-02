import { z } from 'zod';
import { QueryDefinitionSchema, type QueryDefinition } from './query.js';

// ---------- Query results ----------

export interface ResultColumn {
  key: string;
  label: string;
  kind: 'dimension' | 'metric';
}

export type ResultRow = Record<string, string | number | null>;

export interface QueryResult {
  question: string;
  /** `grouped` when groupBy is set (table + chart), `records` otherwise (table only). */
  mode: 'grouped' | 'records';
  columns: ResultColumn[];
  rows: ResultRow[];
  /** Total matching records (records mode may return only the first page). */
  totalRecords: number;
  truncated: boolean;
  fromCache: boolean;
  durationMs: number;
}

// ---------- Saved queries ----------

export const SaveQueryInputSchema = z.object({
  name: z.string().trim().min(2, 'שם השאילתה חייב להכיל לפחות 2 תווים').max(100),
  description: z.string().trim().max(500).optional(),
  definition: QueryDefinitionSchema,
});

export type SaveQueryInput = z.infer<typeof SaveQueryInputSchema>;

export interface SavedQuery {
  id: string;
  name: string;
  description: string | null;
  definition: QueryDefinition;
  question: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastRunAt: string | null;
}

// ---------- Free-text (AI) queries ----------

export const NlParseRequestSchema = z.object({
  text: z.string().trim().min(3, 'יש להזין שאלה').max(500),
  dataset: z.string().min(1).default('support-requests'),
});

export type NlParseRequest = z.infer<typeof NlParseRequestSchema>;

export interface NlParseResult {
  definition: QueryDefinition;
  question: string;
  /** Which parser produced the result, e.g. "anthropic" or "rule-based". */
  provider: string;
  /** Parts of the text the parser could not map; shown to the user as a warning. */
  warnings: string[];
}

// ---------- Errors ----------

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string;
  };
}
