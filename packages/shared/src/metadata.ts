/**
 * Metadata describes WHAT can be queried. It is stored in the database and served
 * by the API; the client renders filters from it, the API builds SQL from it and the
 * AI parser builds its prompt from it. Adding a field = adding metadata rows, not code.
 */

export const FIELD_DATA_TYPES = ['enum', 'number', 'year', 'text'] as const;
export type FieldDataType = (typeof FIELD_DATA_TYPES)[number];

/** `in` - one of the listed values. `between` - inclusive range [from, to]. */
export const OPERATORS = ['in', 'between'] as const;
export type Operator = (typeof OPERATORS)[number];

export const AGGREGATES = ['count', 'sum', 'avg'] as const;
export type Aggregate = (typeof AGGREGATES)[number];

export interface FieldOption {
  value: string;
  label: string;
  /** Wording used inside a question, e.g. value "approved" -> "שאושרו". Falls back to label. */
  phrase?: string;
  /** Extra words the free-text parser should recognise, e.g. ["אושר", "מאושרות"]. */
  synonyms?: string[];
}

export interface FieldDefinition {
  key: string;
  label: string;
  dataType: FieldDataType;
  operators: Operator[];
  filterable: boolean;
  groupable: boolean;
  /** Shown as a column when listing individual records. */
  listable: boolean;
  /** Template for a filter on this field: "בתחום {values}". */
  phraseTemplate?: string;
  /** Template for a `between` filter: "בשנים {from}–{to}". */
  rangeTemplate?: string;
  sortOrder: number;
  options?: FieldOption[];
  /** Words that refer to the field itself, e.g. ["מחוזות"] - used for "בחלוקה לפי ...". */
  synonyms?: string[];
}

export interface MetricDefinition {
  key: string;
  label: string;
  aggregate: Aggregate;
  synonyms?: string[];
}

/** A queryable data source, e.g. "support-requests". New sources are new datasets. */
export interface DatasetMetadata {
  key: string;
  label: string;
  /** Opening of every generated question: "הצג את כלל בקשות התמיכה". */
  questionPrefix: string;
  /** What the data is about; tells the AI parser what is in and out of scope. */
  description?: string;
  fields: FieldDefinition[];
  metrics: MetricDefinition[];
}
