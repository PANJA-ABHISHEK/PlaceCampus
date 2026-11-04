import { designationCode, email, identifier, mapHeaders, name } from './import-templates.js';
import type { RowIssue } from './schemas/import-row.schema.js';

describe('import templates', () => {
  it('maps the V3 student workbook headers, including the four new columns', () => {
    const map = mapHeaders('STUDENTS', [
      'Student Name', 'Reg No', 'Program', 'School', 'Graduation Batch', 'CGPA (Randomly Generated)', 'Current Semester', 'Institutional Email',
    ]);
    expect(map.missing).toEqual([]);
    expect(map.ignored).toEqual([]);
    expect(Object.fromEntries(map.columnMap.map((c) => [c.source, c.target]))).toEqual({
      'Student Name': 'official_name',
      'Reg No': 'registration_number',
      Program: 'programme',
      School: 'department',
      'Graduation Batch': 'graduation_batch',
      'CGPA (Randomly Generated)': 'cgpa',
      'Current Semester': 'current_semester',
      'Institutional Email': 'university_email',
    });
  });

  it('maps the faculty workbook and reports the missing email column', () => {
    const map = mapHeaders('FACULTY', ['Sr. No.', 'UID', 'Faculty Name', 'Department / School', 'Designation']);
    expect(map.missing).toEqual(['official_email']);
    expect(map.columnMap.find((c) => c.source === 'UID')?.target).toBe('employee_id');
    expect(map.columnMap.find((c) => c.source === 'Sr. No.')?.target).toBe('sr_no');
  });

  it('rejects duplicate headers', () => {
    expect(mapHeaders('STUDENTS', ['Reg No', 'Registration Number', 'Name']).duplicates).toEqual(['Registration Number']);
  });

  it('keeps registration numbers as exact strings', () => {
    const issues: RowIssue[] = [];
    const pattern = /^[A-Za-z0-9/-]{4,30}$/;
    expect(identifier(12213795, 'r', 'Reg', pattern, issues)).toBe('12213795');
    expect(identifier('0012213795', 'r', 'Reg', pattern, issues)).toBe('0012213795');
    expect(identifier(1.2213795e7 + 0.5, 'r', 'Reg', pattern, issues)).toBeNull();
    expect(identifier(2 ** 60, 'r', 'Reg', pattern, issues)).toBeNull();
    expect(issues.map((i) => i.code)).toEqual(['NOT_EXACT_IDENTIFIER', 'NOT_EXACT_IDENTIFIER']);
  });

  it('records institutional email as unverified and checks configured domains', () => {
    const errors: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    expect(email('Goutham.M2023@LPU.in', 'e', [], errors, warnings)).toBe('goutham.m2023@lpu.in');
    expect(warnings.map((w) => w.code)).toEqual(['EMAIL_DOMAIN_NOT_CONFIGURED', 'EMAIL_UNVERIFIED']);
    expect(email('x@gmail.com', 'e', ['lpu.in'], errors, [])).toBeNull();
    expect(email('not-an-email', 'e', [], errors, [])).toBeNull();
    expect(errors.map((e) => e.code)).toEqual(['EMAIL_DOMAIN_NOT_ALLOWED', 'INVALID_EMAIL']);
  });

  it('normalises whitespace in names and flags it', () => {
    const warnings: RowIssue[] = [];
    expect(name('  Amar  Mani Mishra ', 'n', 'Name', [], warnings)).toBe('Amar Mani Mishra');
    expect(warnings[0].code).toBe('WHITESPACE_NORMALISED');
  });

  it('derives designation codes', () => {
    expect(designationCode('Professor and Head')).toBe('PROFESSOR_AND_HEAD');
    expect(designationCode('Assistant Professor (Senior Scale)')).toBe('ASSISTANT_PROFESSOR_SENIOR_SCALE');
  });
});
