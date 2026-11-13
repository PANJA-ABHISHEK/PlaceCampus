# Batch readiness performance — 2026-11-08

**Requirement:** REQ-P06-11 / AC-RDY-05. Compute batch readiness for a 5,000-student cohort as a background job in under 15 minutes, with the duration recorded in `batch_runs`.

**Result:** met. 5,000 students took 3.2–3.6 s (median 3.2 s, maximum 3.6 s over four runs). That is about 0.4% of the 15-minute limit.

## Implementation (Master Plan §15.11)

1. `POST /readiness/batch-runs` (Placement Head or Administrator) creates a `batch_runs` document. It records the scope (graduation year and/or department), trigger, requester, total and chunk count, then returns `202` immediately.
2. Students are split into chunks of 250 (20 chunks for 5,000). The chunks are added to the `readiness` Bull queue in one `addBulk` call, with 3 attempts and exponential backoff. If Redis is unavailable, they run in-process with the same parallelism.
3. Each chunk does one `$in` read per input (profiles, skill profiles, assessment attempts, verified projects, completed interviews, latest snapshots), scores in memory with `scoreReadiness()`, and writes one `insertMany`. The per-student recompute uses the same function, so results are identical. Only changed snapshots are written.
4. Progress is updated atomically with `$inc`. A `chunksDone` guard (`$ne` + `$addToSet`) means a retried chunk is never counted twice. The last chunk sets `COMPLETED` (or `COMPLETED_WITH_ERRORS`) and records `durationMs` and per-chunk timings. Per-student failures are listed without stopping the run.
5. Only one run can be active at a time (409 otherwise). A run with no progress for 30 minutes is marked `FAILED`, so a crashed worker cannot block new runs.

## Procedure (Master Plan §33.5)

`apps/api/src/readiness/readiness-batch.load.spec.ts`:

```
MONGO_TEST_URI=mongodb://localhost:27999/pc_batch_load \
REDIS_TEST_URL=redis://localhost:6399 \
BATCH_LOAD_STUDENTS=5000 pnpm vitest run readiness-batch.load --disableConsoleIntercept
```

- **Dataset.** Deterministic synthetic cohort (seeded PRNG, all `isDemoData: true`). Each student has a profile with CGPA, department and graduation year, plus 30 skills (about 60% verified), 6 assessment attempts, 0–3 verified projects and 0–2 completed interviews. For 5,000 students that is 150,000 skills, 30,000 attempts, 7,546 projects and 5,089 interviews.
- **Path.** The real Bull queue on Redis, with the processor at concurrency 4 in one worker process.
- **Checks.**
  - All students processed, 0 failures, one snapshot each.
  - 25 sampled students recomputed through the per-student path give identical scores, and that path writes no new snapshot.
  - A re-run with unchanged inputs writes nothing.
  - A run scoped to one cohort processes only that cohort.

## Environment

| | |
|---|---|
| Machine | Intel Core i5-1335U, 16 GB RAM, Windows 11 (developer laptop) |
| MongoDB | 7.0.45, single node, Docker, local |
| Redis | 7.4.12, Docker, local |
| Node.js | 24.20.0 |
| Workers | 1 process, Bull concurrency 4, chunk size 250 |

## Results

| Run | Students | First run (all snapshots written) | Re-run (nothing changed) | Chunk median / max |
|---|---|---|---|---|
| 1 | 5,000 | 3,217 ms | 418 ms | 445 / 821 ms |
| 2 | 5,000 | 3,224 ms | 344 ms | 470 / 827 ms |
| 3 | 5,000 | 3,383 ms | 362 ms | 500 / 855 ms |
| 4 (final code) | 5,000 | 3,553 ms | 401 ms | 544 / 806 ms |
| Stress | 10,000 | 6,652 ms | 734 ms | 600 / 814 ms |

- **5,000 students:** median 3.2 s, maximum 3.6 s. The acceptance limit is 15 minutes (900 s).
- **Scaling:** time is linear in cohort size (10,000 students take about 2× as long as 5,000).
- **Baseline for comparison:** the previous one-student-at-a-time path, timed on the same data, takes 22–37 ms per student. That projects to about 1.9–6.1 minutes for 5,000–10,000 students, run sequentially on the request path.

## Caveats

- **Not yet measured on staging.** These figures use a local MongoDB with sub-millisecond latency. §33.5 asks for a staging (Atlas) measurement. A chunk makes about 9 database round trips. Even at 100 ms per round trip on Atlas, 20 chunks at concurrency 4 add only seconds, so the 15-minute limit has wide margin. Record the staging figure here when it is run.
- **Score definition.** The readiness formula itself is unchanged by this work: five weighted factors, including CGPA. Plan AC-RDY-02 (readiness must not read CGPA) is a separate, pre-existing gap.
