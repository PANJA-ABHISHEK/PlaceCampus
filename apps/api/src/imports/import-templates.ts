import type { CellValue } from '../common/xlsx/xlsx.js';
import type { ImportKind } from './schemas/import-job.schema.js';
import type { RowIssue } from './schemas/import-row.schema.js';

/**
 * Template dictionary (Master Plan Appendix C) plus header aliases so a
 * free-form institution workbook can be column-mapped onto the official keys.
 * Mapped workbooks are flagged (template = MAPPED) and the mapping must be
 * acknowledged at confirmation — template validation is never skipped silently.
 */
export interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
  /** Excluded from every record write (kept in the row's raw source only). */
  excluded?: string;
  /** Derived by the source: stored as pending, never authoritative until approved. */
  derived?: boolean;
}

export const TEMPLATE_VERSION = '1';

export const TEMPLATES: Record<ImportKind, { sheet: string; fields: FieldDef[] }> = {
  STUDENTS: {
    sheet: 'Students',
    fields: [
      { key: 'registration_number', label: 'Registration number', required: true, aliases: ['reg no', 'reg. no.', 'registration no', 'registration number', 'regno'] },
      { key: 'official_name', label: 'Official name', required: true, aliases: ['student name', 'name', 'full name'] },
      { key: 'university_email', label: 'University email', required: true, aliases: ['institutional email', 'email', 'official email', 'university email'] },
      { key: 'programme', label: 'Programme', required: true, aliases: ['program', 'programme', 'programme_code', 'program name'] },
      { key: 'department', label: 'Department / School', required: true, aliases: ['school', 'department', 'department_code', 'department / school'] },
      { key: 'graduation_batch', label: 'Graduation batch', required: false, derived: true, aliases: ['graduation batch', 'batch'] },
      { key: 'current_semester', label: 'Current semester', required: false, derived: true, aliases: ['current semester', 'semester'] },
      { key: 'phone', label: 'Phone', required: false, aliases: ['mobile', 'phone number'] },
      { key: 'section', label: 'Section', required: false, aliases: [] },
      {
        key: 'cgpa',
        label: 'CGPA',
        required: false,
        aliases: ['cgpa (randomly generated)', 'cgpa', 'current_cgpa'],
        excluded: 'CGPA is not imported from this template: official academic values come only from the Academic Summary sheet of the official template. Values are kept in the batch source for reference and are never used for eligibility or readiness.',
      },
    ],
  },
  FACULTY: {
    sheet: 'Faculty',
    fields: [
      { key: 'employee_id', label: 'Employee ID', required: true, aliases: ['uid', 'employee id', 'emp id', 'staff id'] },
      { key: 'name', label: 'Name', required: true, aliases: ['faculty name', 'full name'] },
      { key: 'official_email', label: 'Official email', required: true, aliases: ['email', 'official email', 'institutional email'] },
      { key: 'department', label: 'Department / School', required: true, aliases: ['department / school', 'school', 'department_code'] },
      { key: 'designation', label: 'Designation', required: true, aliases: [] },
      { key: 'employment_status', label: 'Employment status', required: false, aliases: ['status'] },
      { key: 'phone', label: 'Phone', required: false, aliases: ['mobile'] },
      { key: 'sr_no', label: 'Serial number', required: false, aliases: ['sr. no.', 'sr no', 's. no.', 'serial'], excluded: 'Serial numbers are not identifiers and are ignored.' },
    ],
  },
};

const norm = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ').replace(/\*$/, '').toLowerCase();

/** Maps source headers to template keys; reports unknown and duplicate headers. */
export function mapHeaders(kind: ImportKind, headers: CellValue[]) {
  const fields = TEMPLATES[kind].fields;
  const columnMap: { source: string; target: string; index: number }[] = [];
  const ignored: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  headers.forEach((h, index) => {
    if (h === null || String(h).trim() === '') return;
    const source = String(h).trim();
    const key = norm(source);
    const field = fields.find((f) => f.key === key || norm(f.label) === key || f.aliases.includes(key));
    if (!field) return ignored.push(source);
    if (seen.has(field.key)) return duplicates.push(source);
    seen.add(field.key);
    columnMap.push({ source, target: field.key, index });
  });
  const missing = fields.filter((f) => f.required && !seen.has(f.key)).map((f) => f.key);
  return { columnMap, ignored, duplicates, missing };
}

/* ------------------------------------------------------------------ */
/* Field normalisation                                                 */
/* ------------------------------------------------------------------ */

const asText = (v: CellValue) => (v === null || v === undefined ? '' : typeof v === 'string' ? v : String(v));
export const cleanText = (v: CellValue) => asText(v).normalize('NFC').replace(/\s+/g, ' ').trim();

/**
 * Identifiers stay strings. A numeric cell is accepted only when it is an exact
 * integer that a spreadsheet can hold without rounding.
 */
export function identifier(v: CellValue, field: string, label: string, pattern: RegExp, issues: RowIssue[]) {
  if (v === null || v === '') {
    issues.push({ field, code: 'REQUIRED', message: `${label} is required.` });
    return null;
  }
  let text: string;
  if (typeof v === 'number') {
    if (!Number.isSafeInteger(v)) {
      issues.push({ field, code: 'NOT_EXACT_IDENTIFIER', message: `${label} ${v} is not an exact whole number; store it as text in the workbook.` });
      return null;
    }
    text = v.toFixed(0);
  } else {
    text = cleanText(v);
  }
  if (!pattern.test(text)) {
    issues.push({ field, code: 'INVALID_FORMAT', message: `${label} "${text}" has an invalid format.` });
    return null;
  }
  return text;
}

const EMAIL = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** Email syntax and the configured institution domains (INSTITUTION_EMAIL_DOMAINS). */
export function email(v: CellValue, field: string, allowedDomains: string[], errors: RowIssue[], warnings: RowIssue[]) {
  const text = cleanText(v).toLowerCase();
  if (!text) return null;
  if (!EMAIL.test(text)) {
    errors.push({ field, code: 'INVALID_EMAIL', message: `"${text}" is not a valid email address.` });
    return null;
  }
  const domain = text.split('@')[1];
  if (allowedDomains.length && !allowedDomains.includes(domain)) {
    errors.push({ field, code: 'EMAIL_DOMAIN_NOT_ALLOWED', message: `Domain "${domain}" is not an allowed institution domain.` });
    return null;
  }
  if (!allowedDomains.length) {
    warnings.push({ field, code: 'EMAIL_DOMAIN_NOT_CONFIGURED', message: 'No institution email domains are configured, so the domain could not be checked.' });
  }
  warnings.push({ field, code: 'EMAIL_UNVERIFIED', message: 'Email recorded as unverified; no invitation will be sent until an Administrator confirms it.' });
  return text;
}

export function name(v: CellValue, field: string, label: string, errors: RowIssue[], warnings: RowIssue[]) {
  const raw = asText(v);
  const text = cleanText(v);
  if (text.length < 2 || text.length > 120) {
    errors.push({ field, code: text ? 'INVALID_LENGTH' : 'REQUIRED', message: `${label} must be 2–120 characters.` });
    return null;
  }
  if (raw !== text) warnings.push({ field, code: 'WHITESPACE_NORMALISED', message: 'Extra spaces were removed.' });
  return text;
}

/** "Professor and Head" -> PROFESSOR_AND_HEAD */
export const designationCode = (text: string) =>
  text.normalize('NFC').toUpperCase().replace(/\(.*?\)/g, (m) => m.replace(/[()]/g, '')).replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
