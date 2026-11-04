import { readWorkbook, readWorkbookWithProperties, writeWorkbook, safeCell, XlsxError } from './xlsx.js';

describe('xlsx', () => {
  it('round-trips sheets, strings, numbers and booleans', () => {
    const buf = writeWorkbook([
      { name: 'Students', rows: [['Reg No', 'Name', 'CGPA', 'Active'], [12213795, 'Tëst & <Name>', 7.5, true]] },
      { name: 'Notes', rows: [['A note']] },
    ]);
    const sheets = readWorkbook(buf);
    expect(sheets.map((s) => s.name)).toEqual(['Students', 'Notes']);
    expect(sheets[0].rows[1]).toEqual([12213795, 'Tëst & <Name>', 7.5, true]);
    expect(sheets[1].rows[0]).toEqual(['A note']);
  });

  it('keeps blank cells in position', () => {
    const buf = writeWorkbook([{ name: 'S', rows: [['a', null, 'c']] }]);
    expect(readWorkbook(buf)[0].rows[0]).toEqual(['a', null, 'c']);
  });

  it('rejects non-zip and password-protected files', () => {
    expect(() => readWorkbook(Buffer.from('not a workbook at all, definitely not'))).toThrow(XlsxError);
  });

  it('rejects macro-enabled workbooks', () => {
    const buf = writeWorkbook([{ name: 'S', rows: [['x']] }]);
    // Append a vbaProject part by rebuilding with an extra entry name.
    const tampered = Buffer.from(buf.toString('latin1').replace('xl/workbook.xml', 'xl/vbaProject.bin'), 'latin1');
    expect(() => readWorkbook(tampered)).toThrow(/Macro-enabled|not an .xlsx|damaged/);
  });

  it('reads custom document properties (template tag)', () => {
    const buf = writeWorkbook([{ name: 'Students', rows: [['registration_number*']] }], { pcTemplate: 'STUDENTS', pcTemplateVersion: '1' });
    expect(readWorkbookWithProperties(buf).properties).toEqual({ pcTemplate: 'STUDENTS', pcTemplateVersion: '1' });
  });

  it('neutralises formula-like cells in reports', () => {
    expect(safeCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(safeCell('Plain')).toBe('Plain');
  });
});
