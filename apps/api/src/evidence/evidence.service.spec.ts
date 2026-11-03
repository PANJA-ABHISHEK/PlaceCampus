import { plainToInstance } from 'class-transformer';
import { EvidenceStatus, EvidenceType } from '@placecampus/shared-types';
import {
  EvidenceService,
  VERIFICATION_ENQUEUE_TIMEOUT_MS,
} from './evidence.service.js';
import { UpdateEvidenceDto } from './dto/evidence.dto.js';

function makeEvidence() {
  const doc: any = {
    _id: { toString: () => 'evidence-1' },
    id: 'evidence-1',
    studentId: 'student-1',
    title: 'AWS Certified Solutions Architect',
    type: EvidenceType.CERTIFICATION,
    issuer: 'Amazon',
    externalUrl: 'https://example.com/badge',
    status: EvidenceStatus.UNVERIFIED,
  };
  doc.set = vi.fn((key: string, value: unknown) => {
    doc[key] = value;
  });
  doc.save = vi.fn().mockImplementation(async () => {
    // Mirror the schema's required fields.
    if (!doc.title || !doc.type) throw new Error('Validation failed');
    return doc;
  });
  doc.toObject = () => ({
    _id: doc._id,
    title: doc.title,
    type: doc.type,
    issuer: doc.issuer,
    externalUrl: doc.externalUrl,
    status: doc.status,
    rejectionReason: doc.rejectionReason,
    document: doc.document ? { ...doc.document } : undefined,
  });
  return doc;
}

describe('EvidenceService.update', () => {
  let evidence: any;
  let service: EvidenceService;

  beforeEach(() => {
    evidence = makeEvidence();
    const model: any = {
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(evidence),
      }),
    };
    service = new EvidenceService(model, { add: vi.fn() } as any);
  });

  it('updates only the provided fields of a transformed DTO', async () => {
    // ValidationPipe({ transform: true }) produces this shape: every declared
    // field is an own property, undefined unless sent.
    const dto = plainToInstance(UpdateEvidenceDto, { issuer: 'AWS' });

    const result = await service.update('evidence-1', 'student-1', dto);

    expect(result.issuer).toBe('AWS');
    expect(result.title).toBe('AWS Certified Solutions Architect');
    expect(result.type).toBe(EvidenceType.CERTIFICATION);
    expect(result.externalUrl).toBe('https://example.com/badge');
  });

  it('clears a field sent as null', async () => {
    const dto = plainToInstance(UpdateEvidenceDto, { externalUrl: null });

    const result = await service.update('evidence-1', 'student-1', dto);

    expect(result.externalUrl).toBeNull();
  });

  it('sends rejected evidence back for verification after an edit', async () => {
    evidence.status = EvidenceStatus.REJECTED;
    evidence.rejectionReason = 'Blurry scan';

    const result = await service.update(
      'evidence-1',
      'student-1',
      plainToInstance(UpdateEvidenceDto, { title: 'Updated title' }),
    );

    expect(result.status).toBe(EvidenceStatus.UNVERIFIED);
    expect(result.rejectionReason).toBeUndefined();
  });
});

describe('EvidenceService.attachDocument', () => {
  const documentMeta = {
    id: 'file-1',
    originalName: 'certificate.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    key: 'evidence/student-1/file-1.pdf',
    url: '/api/v1/evidence/evidence-1/document/download',
  };

  let evidence: any;
  let model: any;
  let queue: { add: ReturnType<typeof vi.fn> };
  let service: EvidenceService;

  beforeEach(() => {
    evidence = makeEvidence();
    model = {
      findOne: vi.fn().mockReturnValue({
        exec: vi.fn().mockResolvedValue(evidence),
      }),
    };
    queue = { add: vi.fn() };
    service = new EvidenceService(model, queue as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('queues verification and leaves the evidence PROCESSING', async () => {
    queue.add.mockResolvedValue({ id: 'job-1' });

    const result = await service.attachDocument(
      'evidence-1',
      'student-1',
      documentMeta,
    );

    expect(queue.add).toHaveBeenCalledWith(
      'verify-evidence',
      expect.objectContaining({ evidenceId: 'evidence-1' }),
      expect.any(Object),
    );
    expect(result.status).toBe(EvidenceStatus.PROCESSING);
    expect(result.document.key).toBeUndefined();
  });

  it('falls back to manual review when the queue never accepts the job', async () => {
    vi.useFakeTimers();
    // Bull waits indefinitely for Redis instead of rejecting.
    queue.add.mockReturnValue(new Promise(() => {}));

    const pending = service.attachDocument(
      'evidence-1',
      'student-1',
      documentMeta,
    );
    await vi.advanceTimersByTimeAsync(VERIFICATION_ENQUEUE_TIMEOUT_MS);
    const result = await pending;

    expect(result.status).toBe(EvidenceStatus.NEEDS_REVIEW);
    expect(result.rejectionReason).toMatch(/Manual faculty review/);
  });

  it('falls back to manual review when the queue rejects', async () => {
    queue.add.mockRejectedValue(new Error('ECONNREFUSED'));

    const result = await service.attachDocument(
      'evidence-1',
      'student-1',
      documentMeta,
    );

    expect(result.status).toBe(EvidenceStatus.NEEDS_REVIEW);
  });
});
