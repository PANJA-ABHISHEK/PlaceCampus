import { BadRequestException, ConflictException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ResumeAnalyzerService, sanitizeFileName } from './resume-analyzer.service.js';
import { DOCX_MIME, PDF_MIME } from './parsing/resume-file.validation.js';

const chain = (value: unknown) => {
  const q: any = { select: () => q, lean: () => q, sort: () => q, limit: () => q, exec: async () => value };
  return q;
};

function setup(overrides: { resume?: any; aiEnabled?: boolean } = {}) {
  const resumeModel = {
    findOne: vi.fn(() => chain(overrides.resume ?? null)),
    findOneAndUpdate: vi.fn(() => chain({ id: 'r1', fileName: 'cv.pdf', fileType: 'PDF', size: 10, pageCount: 1, wordCount: 300, extractionMethod: 'PDF_TEXT', updatedAt: new Date() })),
    findOneAndDelete: vi.fn(() => chain(null)),
  };
  const analysisModel = {
    find: vi.fn(() => chain([])),
    findOne: vi.fn(() => chain(null)),
    deleteOne: vi.fn(() => chain({ deletedCount: 0 })),
    create: vi.fn(),
  };
  const profileModel = { findOne: vi.fn(() => chain(null)) };
  const storage = { saveFile: vi.fn(async () => ({ key: 'resumes/s1/x.pdf' })), deleteFile: vi.fn() };
  const parser = { parse: vi.fn(async () => ({ text: 'x'.repeat(300), method: 'PDF_TEXT', pageCount: 1, wordCount: 300, ocrConfidence: null, sha256: 'h' })) };
  const ai = { enabled: overrides.aiEnabled ?? true, provider: 'groq', model: 'm' };
  let releaseAts: () => void = () => undefined;
  const ats = {
    promptVersion: 'resume-analysis/v1',
    analyze: vi.fn(() => new Promise((_resolve, reject) => (releaseAts = () => reject(new Error('stop'))))),
  };
  const jobMatch = { promptVersion: 'job-match/v1', match: vi.fn() };
  const config = { get: vi.fn(() => undefined) };
  const service = new ResumeAnalyzerService(
    config as any, resumeModel as any, analysisModel as any, profileModel as any,
    storage as any, parser as any, ai as any, ats as any, jobMatch as any,
  );
  return { service, resumeModel, analysisModel, storage, parser, ats, release: () => releaseAts() };
}

describe('ResumeAnalyzerService', () => {
  it('scopes every read and delete to the authenticated student', async () => {
    const { service, resumeModel, analysisModel } = setup();
    await service.getResume('s1');
    await service.listAnalyses('s1');
    await expect(service.getAnalysis('s1', '65f000000000000000000001')).rejects.toThrow(NotFoundException);
    await expect(service.deleteAnalysis('s1', '65f000000000000000000001')).rejects.toThrow(NotFoundException);
    await expect(service.removeResume('s1')).rejects.toThrow(NotFoundException);
    expect(resumeModel.findOne).toHaveBeenCalledWith({ studentId: 's1' });
    expect(analysisModel.find).toHaveBeenCalledWith({ studentId: 's1' });
    expect(analysisModel.findOne).toHaveBeenCalledWith({ _id: '65f000000000000000000001', studentId: 's1' });
    expect(analysisModel.deleteOne).toHaveBeenCalledWith({ _id: '65f000000000000000000001', studentId: 's1' });
    expect(resumeModel.findOneAndDelete).toHaveBeenCalledWith({ studentId: 's1' });
  });

  it('rejects a disguised file before parsing or storing it', async () => {
    const { service, parser, storage } = setup();
    const fake = { originalname: 'cv.pdf', mimetype: PDF_MIME, size: 20, buffer: Buffer.from('MZ not really a pdf') };
    await expect(service.uploadResume('s1', fake)).rejects.toThrow(BadRequestException);
    const wrongType = { originalname: 'cv.pdf', mimetype: DOCX_MIME, size: 20, buffer: Buffer.from('%PDF-1.7') };
    await expect(service.uploadResume('s1', wrongType)).rejects.toThrow('Unsupported file type');
    await expect(service.uploadResume('s1', undefined)).rejects.toThrow(BadRequestException);
    expect(parser.parse).not.toHaveBeenCalled();
    expect(storage.saveFile).not.toHaveBeenCalled();
  });

  it('stores a valid upload under the student namespace and replaces the previous file', async () => {
    const { service, storage, resumeModel } = setup({ resume: { storageKey: 'resumes/s1/old.pdf' } });
    const file = { originalname: '../../My CV.pdf', mimetype: PDF_MIME, size: 20, buffer: Buffer.from('%PDF-1.7 real') };
    const stored = await service.uploadResume('s1', file);
    expect(storage.saveFile).toHaveBeenCalledWith('resumes/s1', expect.objectContaining({ originalname: 'My CV.pdf' }));
    expect((resumeModel.findOneAndUpdate.mock.calls[0] as unknown[])[0]).toEqual({ studentId: 's1' });
    expect(storage.deleteFile).toHaveBeenCalledWith('resumes/s1/old.pdf');
    expect(stored).not.toHaveProperty('storageKey');
    expect(stored).not.toHaveProperty('text');
  });

  it('requires AI configuration and an uploaded resume', async () => {
    await expect(setup({ aiEnabled: false }).service.analyze('s1', {})).rejects.toThrow(ServiceUnavailableException);
    await expect(setup().service.analyze('s1', {})).rejects.toThrow('Upload your resume');
  });

  it('allows one analysis at a time per student', async () => {
    const resume = { id: 'r1', text: 'Projects\n• Built X', pageCount: 1, extractionMethod: 'PDF_TEXT', fileName: 'cv.pdf', fileType: 'PDF', sha256: 'h' };
    const { service, release } = setup({ resume });
    const first = service.analyze('s1', {});
    await new Promise((r) => setTimeout(r, 0));
    await expect(service.analyze('s1', {})).rejects.toThrow(ConflictException);
    release();
    await expect(first).rejects.toThrow('stop');
  });

  it('sanitises display file names', () => {
    expect(sanitizeFileName('C:\\fakepath\\resume<1>.pdf')).toBe('resume1.pdf');
    expect(sanitizeFileName('')).toBe('resume');
  });
});
