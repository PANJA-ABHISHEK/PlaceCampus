import { ExtractionStoreService, MAX_STORED_TEXT } from './extraction-store.service.js';
import type { ExtractionResult } from './providers/document-extractor.service.js';

function chain(result: unknown) {
  const q: any = {};
  for (const m of ['select', 'lean', 'sort']) q[m] = vi.fn().mockReturnValue(q);
  q.exec = vi.fn().mockResolvedValue(result);
  return q;
}

const base: ExtractionResult = {
  text: 'x',
  method: 'OCR',
  status: 'COMPLETED',
  hasText: true,
  wordCount: 1,
  charCount: 1,
  ocrConfidence: 90,
  pageCount: 1,
  pages: [],
  fileSha256: 'file-hash',
  textFingerprint: 'text-hash',
  engineVersions: {},
  durationMs: 5,
};

describe('ExtractionStoreService', () => {
  it('finds file and text duplicates, skipping deleted evidence and preferring FILE matches', async () => {
    const extractionModel: any = {
      find: vi.fn().mockReturnValue(
        chain([
          { evidenceId: 'e2', studentId: 's1', textFingerprint: 'text-hash' },
          { evidenceId: 'e2', studentId: 's1', fileSha256: 'file-hash' },
          { evidenceId: 'e3', studentId: 's9', textFingerprint: 'text-hash' },
          { evidenceId: 'deleted', studentId: 's9', fileSha256: 'file-hash' },
        ]),
      ),
    };
    const evidenceModel: any = { find: vi.fn().mockReturnValue(chain([{ _id: 'e2' }, { _id: 'e3' }])) };
    const store = new ExtractionStoreService(extractionModel, evidenceModel);

    const matches = await store.findDuplicates('e1', 's1', base);

    expect(extractionModel.find).toHaveBeenCalledWith({
      evidenceId: { $ne: 'e1' },
      $or: [{ fileSha256: 'file-hash' }, { textFingerprint: 'text-hash' }],
    });
    expect(matches).toEqual([
      { evidenceId: 'e2', matchType: 'FILE', sameStudent: true },
      { evidenceId: 'e3', matchType: 'TEXT', sameStudent: false },
    ]);
  });

  it('skips the lookup when there is nothing to fingerprint', async () => {
    const extractionModel: any = { find: vi.fn() };
    const store = new ExtractionStoreService(extractionModel, {} as any);
    const matches = await store.findDuplicates('e1', 's1', { ...base, fileSha256: null, textFingerprint: null });
    expect(matches).toEqual([]);
    expect(extractionModel.find).not.toHaveBeenCalled();
  });

  it('truncates stored text', async () => {
    const extractionModel: any = { create: vi.fn().mockImplementation(async (doc) => doc) };
    const store = new ExtractionStoreService(extractionModel, {} as any);
    const text = 'a'.repeat(MAX_STORED_TEXT + 10);
    const saved: any = await store.save({ evidenceId: 'e1', studentId: 's1', version: 2, result: { ...base, text } });
    expect(saved.text).toHaveLength(MAX_STORED_TEXT);
    expect(saved.textTruncated).toBe(true);
    expect(saved.version).toBe(2);
  });
});
