import { ConfigService } from '@nestjs/config';
import { AutoAllocationService } from './auto-allocation.service.js';

function setup(env: Record<string, string> = {}) {
  const autoAllocate = vi.fn(async () => ({ created: 2, skipped: 0, totals: { unassigned: 1 } }));
  const service = new AutoAllocationService(
    { autoAllocate } as any,
    new ConfigService({ AUTO_MENTOR_ALLOCATION_DEBOUNCE_MS: '20', ...env }),
  );
  return { service, autoAllocate };
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('AutoAllocationService', () => {
  it('coalesces a burst of triggers into one run', async () => {
    const { service, autoAllocate } = setup();
    service.onImport({ kind: 'STUDENTS' });
    service.onMapping();
    service.onProfileCreated();
    await wait(80);
    expect(autoAllocate).toHaveBeenCalledTimes(1);
    expect(autoAllocate).toHaveBeenCalledWith('import:STUDENTS,department-mapping,student-profile');
  });

  it('runs again for triggers that arrive during a run', async () => {
    const { service, autoAllocate } = setup();
    let release!: () => void;
    autoAllocate.mockImplementationOnce(
      () => new Promise((resolve) => (release = () => resolve({ created: 1, skipped: 0, totals: { unassigned: 0 } }))),
    );
    service.request('first');
    await wait(40);
    service.request('second');
    await wait(40);
    release();
    await wait(80);
    expect(autoAllocate.mock.calls.map((c) => (c as unknown[])[0])).toEqual(['first', 'second']);
  });

  it('does nothing when disabled', async () => {
    const { service, autoAllocate } = setup({ AUTO_MENTOR_ALLOCATION: 'false' });
    service.onImport({ kind: 'STUDENTS' });
    await wait(60);
    expect(autoAllocate).not.toHaveBeenCalled();
  });

  it('never throws when allocation fails', async () => {
    const { service, autoAllocate } = setup();
    autoAllocate.mockRejectedValueOnce(new Error('db down'));
    service.request('x');
    await wait(60);
    service.request('y');
    await wait(60);
    expect(autoAllocate).toHaveBeenCalledTimes(2);
  });
});
