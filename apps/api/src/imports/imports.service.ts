import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { Model, Types } from 'mongoose';
import type { ClientSession, Connection } from 'mongoose';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { UserRole } from '@placecampus/shared-types';
import { ImportJob, ImportJobDocument, ImportKind, ImportMode } from './schemas/import-job.schema.js';
import { FieldDiff, ImportRow, ImportRowDocument, RowAction, RowIssue } from './schemas/import-row.schema.js';
import { TEMPLATES, TEMPLATE_VERSION, cleanText, designationCode, email, identifier, mapHeaders, name } from './import-templates.js';
import { CellValue, readWorkbookWithProperties, safeCell, writeWorkbook, XlsxError } from '../common/xlsx/xlsx.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import { StudentProfile, StudentProfileDocument } from '../students/schemas/student-profile.schema.js';
import { FacultyAssignment, FacultyAssignmentDocument } from '../assignments/schemas/faculty-assignment.schema.js';
import { OrgService, normalizeSource, Actor } from '../org/org.service.js';
import { AuditService } from '../audit/audit.service.js';
import { StorageService } from '../storage/storage.service.js';

export const IMPORT_CHUNK_SIZE = 200;
export const MAX_IMPORT_ROWS = 10_000;
const CONFIRM_WINDOW_DAYS = 7;
const REVERT_WINDOW_DAYS = 14;
const REIMPORT_WINDOW_DAYS = 30;
const ENQUEUE_TIMEOUT_MS = 3000;
/** Imported accounts cannot sign in until activated; this is never a valid bcrypt hash. */
export const UNUSABLE_PASSWORD = '!invited-not-activated';

const REG_NO = /^[A-Za-z0-9/-]{4,30}$/;
const EMPLOYEE_ID = /^[A-Za-z0-9/_-]{2,30}$/;
const EMPLOYMENT = ['ACTIVE', 'ON_LEAVE', 'RELIEVED'];
const days = (n: number) => n * 86_400_000;

type Normalized = Record<string, unknown>;
interface BuiltRow {
  rowNumber: number;
  raw: Record<string, unknown>;
  normalized: Normalized;
  rowErrors: RowIssue[];
  warnings: RowIssue[];
  naturalKey?: string;
  rowHash: string;
  action?: RowAction;
  matchedBy?: 'registration_number' | 'employee_id' | 'email';
  matchedUserId?: string;
  diff?: FieldDiff[];
}

@Injectable()
export class ImportsService {
  private readonly logger = new Logger(ImportsService.name);

  constructor(
    @InjectModel(ImportJob.name) private jobModel: Model<ImportJobDocument>,
    @InjectModel(ImportRow.name) private rowModel: Model<ImportRowDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(StudentProfile.name) private profileModel: Model<StudentProfileDocument>,
    @InjectModel(FacultyAssignment.name) private assignmentModel: Model<FacultyAssignmentDocument>,
    @InjectConnection() private connection: Connection,
    private org: OrgService,
    private audit: AuditService,
    private storage: StorageService,
    @Optional() @InjectQueue('imports') private queue?: Queue,
  ) {}

  private allowedDomains() {
    return (process.env.INSTITUTION_EMAIL_DOMAINS ?? '')
      .split(',')
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean);
  }

  private demoImportsAllowed() {
    return process.env.NODE_ENV !== 'production' || process.env.ALLOW_DEMO_IMPORTS === 'true';
  }

  /* ------------------------------------------------------------------ */
  /* Upload                                                              */
  /* ------------------------------------------------------------------ */

  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number } | undefined,
    opts: { kind: ImportKind; mode?: ImportMode; isDemoData?: boolean; reimportReason?: string },
    actor: Actor,
  ) {
    if (!file?.buffer?.length) throw new BadRequestException('Choose an .xlsx file to upload.');
    if (!/\.xlsx$/i.test(file.originalname)) {
      throw new BadRequestException('Only .xlsx workbooks are accepted (macro-enabled .xlsm and legacy .xls are rejected).');
    }
    if (!['STUDENTS', 'FACULTY'].includes(opts.kind)) throw new BadRequestException('Unknown import type.');
    const mode = opts.mode ?? 'CREATE_ONLY';
    if (!['CREATE_ONLY', 'CREATE_AND_UPDATE_PROFILE'].includes(mode)) {
      throw new BadRequestException('Unsupported mode. ACADEMIC_UPDATE needs the official Academic Summary sheet.');
    }
    if (opts.isDemoData && !this.demoImportsAllowed()) {
      throw new ForbiddenException('Demo-data imports are disabled in production.');
    }

    const fileSha256 = createHash('sha256').update(file.buffer).digest('hex');
    const recent = await this.jobModel
      .findOne({
        fileSha256,
        kind: opts.kind,
        mode,
        status: { $in: ['VALIDATING', 'AWAITING_CONFIRMATION', 'COMMITTING', 'COMMITTED', 'PARTIALLY_COMMITTED'] },
        createdAt: { $gte: new Date(Date.now() - days(REIMPORT_WINDOW_DAYS)) },
      })
      .lean()
      .exec();
    if (recent && !opts.reimportReason?.trim()) {
      throw new ConflictException({
        message: 'This file was already imported in the last 30 days. Give a reason to import it again.',
        existingJobId: String(recent._id),
      });
    }

    const job = await this.jobModel.create({
      kind: opts.kind,
      mode,
      status: 'UPLOADED',
      fileName: file.originalname,
      fileSha256,
      fileSize: file.size,
      isDemoData: !!opts.isDemoData,
      uploadedBy: actor.userId,
      reimportReason: opts.reimportReason?.trim() || undefined,
    });
    const saved = await this.storage.saveFile(`imports/${job.id}`, file);
    job.fileKey = saved.key;
    job.status = 'VALIDATING';
    await job.save();

    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_UPLOADED', resourceType: 'IMPORT_BATCH',
      resourceId: job.id, metadata: { kind: job.kind, mode, fileName: job.fileName, fileSha256, isDemoData: job.isDemoData },
    });
    await this.dispatch('validate', job.id);
    return this.serialize(job.toObject());
  }

  /** Background work goes to the `imports` queue; without Redis it runs in-process, still off the request. */
  private async dispatch(task: 'validate' | 'commit', jobId: string) {
    const run = () =>
      setImmediate(() => {
        const work = task === 'validate' ? this.runValidation(jobId) : this.runCommit(jobId);
        work.catch((e) => this.logger.error(`Import ${task} ${jobId} failed: ${e.message}`));
      });
    if (!this.queue) return run();
    let timer: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.queue.add(task, { jobId }, { attempts: 1, removeOnComplete: true }),
        new Promise((_, reject) => (timer = setTimeout(() => reject(new Error('queue unavailable')), ENQUEUE_TIMEOUT_MS))),
      ]);
    } catch {
      run();
    } finally {
      clearTimeout(timer);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Validation                                                          */
  /* ------------------------------------------------------------------ */

  async runValidation(jobId: string) {
    const job = await this.jobModel.findById(jobId).exec();
    if (!job || !['VALIDATING', 'AWAITING_CONFIRMATION', 'VALIDATION_FAILED'].includes(job.status)) return;
    const fail = async (reason: string) => {
      job.status = 'VALIDATION_FAILED';
      job.failureReason = reason;
      await job.save();
      await this.audit.logAction({ actorId: job.uploadedBy, actorRole: UserRole.ADMIN, action: 'IMPORT_VALIDATION_FAILED', resourceType: 'IMPORT_BATCH', resourceId: job.id, success: false, reason });
    };

    let parsed: ReturnType<typeof readWorkbookWithProperties>;
    try {
      const buffer = await fs.readFile(await this.storage.getFilePath(job.fileKey!));
      parsed = readWorkbookWithProperties(buffer);
    } catch (error: any) {
      return fail(error instanceof XlsxError ? error.message : 'The workbook could not be read.');
    }

    const template = TEMPLATES[job.kind];
    // The data sheet is the one whose headers cover the template best.
    const scored = parsed.sheets.map((sheet) => ({ sheet, map: mapHeaders(job.kind, sheet.rows[0] ?? []) }));
    scored.sort((a, b) => a.map.missing.length - b.map.missing.length || b.map.columnMap.length - a.map.columnMap.length);
    const best = scored[0];
    const notes = parsed.sheets
      .filter((s) => s !== best.sheet)
      .flatMap((s) => s.rows.flat().filter((c) => c !== null && String(c).trim()).map((c) => ({ sheet: s.name, text: String(c).trim() })));
    const fileWarnings: { code: string; message: string }[] = [];
    const noteText = notes.map((n) => n.text).join('\n');

    let missing = best.map.missing;
    if (job.kind === 'FACULTY' && missing.includes('official_email') && job.isDemoData) {
      missing = missing.filter((m) => m !== 'official_email');
      fileWarnings.push({ code: 'EMAIL_PLACEHOLDER', message: 'No email column. Demo accounts get non-routable placeholder addresses (…@demo-import.invalid) and can never receive invitations.' });
    }
    if (missing.length) {
      return fail(`Missing required column(s): ${missing.join(', ')}. Expected headers like: ${template.fields.filter((f) => f.required).map((f) => f.label).join(', ')}.`);
    }
    if (best.map.duplicates.length) return fail(`Duplicate column(s): ${best.map.duplicates.join(', ')}.`);
    const officialTemplate = parsed.properties.pcTemplate === job.kind;
    if (officialTemplate && parsed.properties.pcTemplateVersion !== TEMPLATE_VERSION) {
      return fail(`Template version ${parsed.properties.pcTemplateVersion} is not supported (current: ${TEMPLATE_VERSION}). Download the latest template.`);
    }

    // What the source itself says about its data (Notes / Summary sheets).
    const declaresSynthetic = /randomly generated sample|not real|sample data|synthetic/i.test(noteText);
    if (declaresSynthetic && job.kind === 'FACULTY' && !job.isDemoData) {
      return fail('The workbook declares its names/IDs to be randomly generated sample data. Re-upload it as demo data; synthetic identities are never provisioned as real accounts.');
    }
    if (declaresSynthetic) fileWarnings.push({ code: 'SYNTHETIC_DECLARED', message: 'The source declares (some of) its data as sample/synthetic.' });
    for (const field of template.fields) {
      const col = best.map.columnMap.find((c) => c.target === field.key);
      if (col && field.excluded) fileWarnings.push({ code: 'COLUMN_EXCLUDED', message: `Column "${col.source}": ${field.excluded}` });
      if (col && field.derived) {
        fileWarnings.push({ code: 'DERIVED_VALUES', message: `Column "${col.source}" is treated as derived data: stored as pending and not authoritative until an Administrator approves it.` });
      }
    }
    if (/cgpa[^\n]*random/i.test(noteText)) fileWarnings.push({ code: 'CGPA_RANDOM', message: 'Notes say CGPA values are randomly generated: they are never written to academic records.' });
    if (/email[^\n]*(assumed|not verified)/i.test(noteText)) fileWarnings.push({ code: 'EMAIL_ASSUMED', message: 'Notes say the email pattern is assumed: all emails are recorded as unverified and no invitations are sent.' });
    for (const c of best.map.ignored) fileWarnings.push({ code: 'UNKNOWN_COLUMN', message: `Column "${c}" is not part of the template and is ignored.` });

    const dataRows = best.sheet.rows.slice(1).map((cells, i) => ({ cells, rowNumber: i + 2 })).filter((r) => r.cells.some((c) => c !== null && String(c).trim() !== ''));
    if (dataRows.length > MAX_IMPORT_ROWS) return fail(`The sheet has ${dataRows.length} rows; the limit is ${MAX_IMPORT_ROWS}.`);
    if (!dataRows.length) return fail('The sheet has no data rows.');

    const derivation = notes.filter((n) => /batch|semester/i.test(n.text)).map((n) => n.text);
    const built = dataRows.map(({ cells, rowNumber }) => {
      const raw: Record<string, unknown> = {};
      const values: Record<string, CellValue> = {};
      for (const col of best.map.columnMap) {
        raw[col.source] = cells[col.index] ?? null;
        values[col.target] = cells[col.index] ?? null;
      }
      return job.kind === 'STUDENTS'
        ? this.buildStudent(rowNumber, raw, values, derivation)
        : this.buildFaculty(rowNumber, raw, values, job.isDemoData);
    });

    if (job.kind === 'STUDENTS') await this.reconcileStudents(built, job.mode);
    else await this.reconcileFaculty(built, job.mode);
    await this.flagMappings(job.kind, built);

    await this.rowModel.deleteMany({ jobId: job.id }).exec();
    for (let i = 0; i < built.length; i += 1000) {
      await this.rowModel.insertMany(
        built.slice(i, i + 1000).map((r) => ({
          jobId: job.id, rowNumber: r.rowNumber, rowHash: r.rowHash, raw: r.raw, normalized: r.normalized, action: r.action,
          naturalKey: r.naturalKey, matchedBy: r.matchedBy, matchedUserId: r.matchedUserId, diff: r.diff ?? [],
          rowErrors: r.rowErrors, warnings: r.warnings, result: { status: 'PENDING' },
        })),
      );
    }

    const tally = (a: RowAction) => built.filter((r) => r.action === a).length;
    job.summary = {
      total: built.length,
      create: tally('CREATE'),
      update: tally('UPDATE'),
      unchanged: tally('UNCHANGED'),
      skipExisting: tally('SKIP_EXISTING'),
      invalid: tally('INVALID'),
      duplicate: tally('DUPLICATE_IN_FILE'),
      skippedIdentical: tally('SKIPPED_IDENTICAL'),
      conflict: tally('CONFLICT'),
      warnings: built.filter((r) => r.warnings.length).length,
    };
    job.sheetName = best.sheet.name;
    job.template = officialTemplate ? 'OFFICIAL' : 'MAPPED';
    job.columnMap = best.map.columnMap.map(({ source, target }) => ({ source, target }));
    job.ignoredColumns = best.map.ignored;
    job.sourceNotes = notes;
    job.fileWarnings = fileWarnings;
    job.failureReason = undefined;
    job.status = 'AWAITING_CONFIRMATION';
    job.expiresAt = new Date(Date.now() + days(CONFIRM_WINDOW_DAYS));
    await job.save();
    await this.audit.logAction({
      actorId: job.uploadedBy, actorRole: UserRole.ADMIN, action: 'IMPORT_VALIDATED', resourceType: 'IMPORT_BATCH', resourceId: job.id,
      metadata: { summary: job.summary, template: job.template, sourceNotes: notes.map((n) => n.text), fileWarnings: fileWarnings.map((w) => w.code) },
    });
  }

  private hash(n: Normalized) {
    return createHash('sha256').update(JSON.stringify(n)).digest('hex').slice(0, 32);
  }

  private buildStudent(rowNumber: number, raw: Record<string, unknown>, v: Record<string, CellValue>, derivation: string[]): BuiltRow {
    const rowErrors: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    const reg = identifier(v.registration_number, 'registration_number', 'Registration number', REG_NO, rowErrors);
    const officialName = name(v.official_name, 'official_name', 'Official name', rowErrors, warnings);
    const mail = email(v.university_email, 'university_email', this.allowedDomains(), rowErrors, warnings);
    if (!mail && !rowErrors.some((e) => e.field === 'university_email')) rowErrors.push({ field: 'university_email', code: 'REQUIRED', message: 'University email is required.' });
    const programme = cleanText(v.programme);
    const department = cleanText(v.department);
    if (!programme) rowErrors.push({ field: 'programme', code: 'REQUIRED', message: 'Programme is required.' });
    if (!department) rowErrors.push({ field: 'department', code: 'REQUIRED', message: 'Department / School is required.' });

    let graduationBatch: string | undefined;
    const batchText = cleanText(v.graduation_batch);
    if (batchText) {
      const m = /^(\d{4})\s*-\s*(\d{4})$/.exec(batchText);
      if (m && +m[2] > +m[1] && +m[2] - +m[1] <= 7) graduationBatch = `${m[1]}-${m[2]}`;
      else warnings.push({ field: 'graduation_batch', code: 'BATCH_INVALID', message: `"${batchText}" is not a valid YYYY-YYYY batch; it will not be stored.` });
    }
    let currentSemester: number | undefined;
    if (v.current_semester !== null && v.current_semester !== '') {
      const n = Number(v.current_semester);
      if (Number.isInteger(n) && n >= 1 && n <= 12) currentSemester = n;
      else warnings.push({ field: 'current_semester', code: 'SEMESTER_OUT_OF_RANGE', message: `Semester "${v.current_semester}" is outside 1–12; it will not be stored.` });
    }
    if (/lateral/i.test(programme)) {
      warnings.push({ field: 'current_semester', code: 'LATERAL_ENTRY', message: 'Lateral-entry programme: the derived batch and semester assume entry in semester 3. Confirm against academic records.' });
    }
    if (graduationBatch || currentSemester) {
      warnings.push({ field: 'graduation_batch', code: 'DERIVED_PENDING_APPROVAL', message: 'Batch/semester are derived values and stay pending until approved.' });
    }

    const normalized: Normalized = {
      registrationNumber: reg, officialName, email: mail, programme, department, graduationBatch, currentSemester,
      phone: cleanText(v.phone) || undefined, section: cleanText(v.section) || undefined,
      derivation: derivation.length ? derivation : undefined,
    };
    return { rowNumber, raw, normalized, rowErrors, warnings, naturalKey: reg ?? undefined, rowHash: this.hash(normalized), action: rowErrors.length ? 'INVALID' : undefined };
  }

  private buildFaculty(rowNumber: number, raw: Record<string, unknown>, v: Record<string, CellValue>, isDemo: boolean): BuiltRow {
    const rowErrors: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    const employeeId = identifier(v.employee_id, 'employee_id', 'Employee ID', EMPLOYEE_ID, rowErrors);
    const fullName = name(v.name, 'name', 'Name', rowErrors, warnings);
    let mail = email(v.official_email ?? null, 'official_email', this.allowedDomains(), rowErrors, warnings);
    let emailStatus: 'UNVERIFIED' | 'PLACEHOLDER' = 'UNVERIFIED';
    if (!mail && !rowErrors.some((e) => e.field === 'official_email')) {
      if (isDemo && employeeId) {
        mail = `faculty.${employeeId.toLowerCase()}@demo-import.invalid`;
        emailStatus = 'PLACEHOLDER';
        warnings.push({ field: 'official_email', code: 'EMAIL_PLACEHOLDER', message: 'No email supplied: a non-routable demo placeholder is used. This account can never be invited.' });
      } else {
        rowErrors.push({ field: 'official_email', code: 'REQUIRED', message: 'Official email is required for real faculty accounts.' });
      }
    }
    const department = cleanText(v.department);
    if (!department) rowErrors.push({ field: 'department', code: 'REQUIRED', message: 'Department / School is required.' });
    const designation = cleanText(v.designation);
    if (!designation) rowErrors.push({ field: 'designation', code: 'REQUIRED', message: 'Designation is required.' });
    const employment = (cleanText(v.employment_status) || 'ACTIVE').toUpperCase().replace(/\s+/g, '_');
    if (!EMPLOYMENT.includes(employment)) rowErrors.push({ field: 'employment_status', code: 'INVALID_VALUE', message: `Employment status must be one of ${EMPLOYMENT.join(', ')}.` });
    if (employeeId) {
      warnings.push({ field: 'employee_id', code: 'IDENTITY_UNCONFIRMED', message: 'Employee ID recorded as unconfirmed until the institution confirms it.' });
    }
    const normalized: Normalized = {
      employeeId, fullName, email: mail, emailStatus, department, designation,
      designationCode: designation ? designationCode(designation) : undefined, employmentStatus: employment,
      phone: cleanText(v.phone) || undefined,
    };
    return { rowNumber, raw, normalized, rowErrors, warnings, naturalKey: employeeId ?? undefined, rowHash: this.hash(normalized), action: rowErrors.length ? 'INVALID' : undefined };
  }

  /** In-file duplicates by natural key and by email (identical repeats are skipped). */
  private markDuplicates(rows: BuiltRow[]) {
    const groups = (key: (r: BuiltRow) => string | undefined) => {
      const map = new Map<string, BuiltRow[]>();
      for (const r of rows) {
        if (r.action === 'INVALID') continue;
        const k = key(r);
        if (k) map.set(k, [...(map.get(k) ?? []), r]);
      }
      return [...map.values()].filter((g) => g.length > 1);
    };
    for (const group of groups((r) => r.naturalKey)) {
      const identical = group.every((r) => r.rowHash === group[0].rowHash);
      group.forEach((r, i) => {
        if (identical && i > 0) {
          r.action = 'SKIPPED_IDENTICAL';
          r.warnings.push({ code: 'SKIPPED_IDENTICAL', message: `Identical to row ${group[0].rowNumber}.` });
        } else if (!identical) {
          r.action = 'DUPLICATE_IN_FILE';
          r.rowErrors.push({ field: 'natural_key', code: 'DUPLICATE_IN_FILE', message: `Also on row(s) ${group.filter((x) => x !== r).map((x) => x.rowNumber).join(', ')} with different values.` });
        }
      });
    }
    for (const group of groups((r) => (r.action ? undefined : (r.normalized.email as string)))) {
      group.forEach((r) => {
        r.action = 'DUPLICATE_IN_FILE';
        r.rowErrors.push({ field: 'email', code: 'DUPLICATE_IN_FILE', message: `Email also used on row(s) ${group.filter((x) => x !== r).map((x) => x.rowNumber).join(', ')}.` });
      });
    }
  }

  private async reconcileStudents(rows: BuiltRow[], mode: ImportMode) {
    this.markDuplicates(rows);
    const open = rows.filter((r) => !r.action);
    const regs = open.map((r) => r.normalized.registrationNumber as string);
    const emails = open.map((r) => r.normalized.email as string);
    const profiles = await this.profileModel.find({ registrationNumber: { $in: regs } }).lean().exec();
    const byReg = new Map(profiles.map((p) => [p.registrationNumber!, p]));
    const users = await this.userModel
      .find({ $or: [{ email: { $in: emails } }, { _id: { $in: profiles.map((p) => p.userId).filter((id) => Types.ObjectId.isValid(id)) } }] })
      .lean()
      .exec();
    const byEmail = new Map(users.map((u) => [u.email, u]));
    const byId = new Map(users.map((u) => [String(u._id), u]));

    for (const r of open) {
      const n = r.normalized;
      const profile = byReg.get(n.registrationNumber as string);
      const emailOwner = byEmail.get(n.email as string);
      if (profile) {
        const user = byId.get(profile.userId);
        if (emailOwner && String(emailOwner._id) !== profile.userId) {
          r.action = 'CONFLICT';
          r.rowErrors.push({ field: 'university_email', code: 'CONFLICT', message: 'Registration number belongs to one account and the email to another.' });
          continue;
        }
        r.matchedBy = 'registration_number';
        r.matchedUserId = profile.userId;
        const fill = mode === 'CREATE_AND_UPDATE_PROFILE';
        const diff: FieldDiff[] = [];
        const add = (field: string, current: unknown, proposed: unknown, opts: { canApply: boolean; note?: string }) => {
          if (proposed === undefined || proposed === null || proposed === '' || current === proposed) return;
          const empty = current === undefined || current === null || current === '';
          diff.push({ field, current: current ?? null, proposed, apply: fill && opts.canApply && empty, note: !empty ? 'Existing value is kept (imports never overwrite existing values).' : opts.note });
        };
        add('official_name', user?.fullName, n.officialName, { canApply: false, note: 'Name changes need an Administrator correction.' });
        add('university_email', user?.email, n.email, {
          canApply: false,
          note: user?.emailStatus === 'VERIFIED' ? 'Existing confirmed email is preserved.' : 'Email changes need Administrator confirmation.',
        });
        add('department', profile.source?.school, n.department, { canApply: true });
        add('programme', profile.source?.program, n.programme, { canApply: true });
        add('graduation_batch (derived)', profile.batch || profile.derived?.graduationBatch, n.graduationBatch, { canApply: true, note: 'Stored as pending derived data.' });
        add('current_semester (derived)', profile.currentSemester ?? profile.derived?.currentSemester, n.currentSemester, { canApply: true, note: 'Stored as pending derived data.' });
        r.diff = diff;
        r.action = mode === 'CREATE_ONLY' ? 'SKIP_EXISTING' : diff.some((d) => d.apply) ? 'UPDATE' : 'UNCHANGED';
        continue;
      }
      if (emailOwner) {
        r.action = 'CONFLICT';
        r.matchedBy = 'email';
        r.matchedUserId = String(emailOwner._id);
        r.rowErrors.push({ field: 'university_email', code: 'CONFLICT', message: `This email already belongs to another ${emailOwner.role} account with a different registration number.` });
        continue;
      }
      r.action = 'CREATE';
    }
  }

  private async reconcileFaculty(rows: BuiltRow[], mode: ImportMode) {
    this.markDuplicates(rows);
    const open = rows.filter((r) => !r.action);
    const users = await this.userModel
      .find({ $or: [{ employeeId: { $in: open.map((r) => r.normalized.employeeId as string) } }, { email: { $in: open.map((r) => r.normalized.email as string) } }] })
      .lean()
      .exec();
    const byEmp = new Map(users.filter((u) => u.employeeId).map((u) => [u.employeeId!, u]));
    const byEmail = new Map(users.map((u) => [u.email, u]));
    for (const r of open) {
      const n = r.normalized;
      const existing = byEmp.get(n.employeeId as string);
      const emailOwner = byEmail.get(n.email as string);
      if (existing) {
        if ((emailOwner && String(emailOwner._id) !== String(existing._id)) || existing.role !== UserRole.FACULTY) {
          r.action = 'CONFLICT';
          r.rowErrors.push({ field: 'employee_id', code: 'CONFLICT', message: 'Employee ID belongs to a different account or role.' });
          continue;
        }
        r.matchedBy = 'employee_id';
        r.matchedUserId = String(existing._id);
        const fill = mode === 'CREATE_AND_UPDATE_PROFILE';
        const diff: FieldDiff[] = [];
        for (const [field, current, proposed] of [
          ['designation', existing.designation, n.designation],
          ['department', existing.source?.department, n.department],
        ] as const) {
          if (!proposed || current === proposed) continue;
          const empty = !current;
          diff.push({ field, current: current ?? null, proposed, apply: fill && empty, note: empty ? undefined : 'Existing value is kept.' });
        }
        r.diff = diff;
        r.action = mode === 'CREATE_ONLY' ? 'SKIP_EXISTING' : diff.some((d) => d.apply) ? 'UPDATE' : 'UNCHANGED';
        continue;
      }
      if (emailOwner) {
        r.action = 'CONFLICT';
        r.rowErrors.push({ field: 'official_email', code: 'CONFLICT', message: `This email already belongs to another ${emailOwner.role} account.` });
        continue;
      }
      r.action = 'CREATE';
    }
  }

  /** Registers source values for mapping review and warns on rows that are still unmapped. */
  private async flagMappings(kind: ImportKind, rows: BuiltRow[]) {
    const valid = rows.filter((r) => r.action !== 'INVALID');
    const hints = new Map<string, Set<string>>();
    if (kind === 'STUDENTS') {
      for (const r of valid) {
        const d = r.normalized.department as string;
        hints.set(d, (hints.get(d) ?? new Set()).add(r.normalized.programme as string));
      }
      await this.org.ensureMappings('PROGRAMME', valid.map((r) => r.normalized.programme as string));
    }
    await this.org.ensureMappings('DEPARTMENT', valid.map((r) => r.normalized.department as string), hints);
    const departments = await this.org.resolveMany('DEPARTMENT');
    const programmes = await this.org.resolveMany('PROGRAMME');
    const lookups = new Map((await this.org.listLookups('PROGRAMME')).map((l) => [l.code, l]));
    for (const r of valid) {
      const d = departments.get(normalizeSource(r.normalized.department as string));
      if (d?.status !== 'APPROVED') {
        r.warnings.push({ field: 'department', code: 'DEPARTMENT_UNMAPPED', message: `"${r.normalized.department}" has no approved department mapping: the record is imported but stays in the exception queue (no mentor allocation) until approved.` });
      }
      if (kind !== 'STUDENTS') continue;
      const p = programmes.get(normalizeSource(r.normalized.programme as string));
      if (p?.status !== 'APPROVED') {
        r.warnings.push({ field: 'programme', code: 'PROGRAMME_UNMAPPED', message: `"${r.normalized.programme}" has no approved programme mapping.` });
      } else {
        const lookup = lookups.get(p.code!);
        const batch = r.normalized.graduationBatch as string | undefined;
        if (lookup?.durationYears && batch) {
          const [a, b] = batch.split('-').map(Number);
          if (b - a !== lookup.durationYears) {
            r.warnings.push({ field: 'graduation_batch', code: 'BATCH_INCONSISTENT', message: `Batch ${batch} spans ${b - a} years but ${lookup.code} lasts ${lookup.durationYears}.` });
          }
        }
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Confirmation and commit                                             */
  /* ------------------------------------------------------------------ */

  async confirm(
    id: string,
    idempotencyKey: string | undefined,
    body: { confirmRowCount: number; acknowledgeColumnMapping?: boolean; acknowledgeDiff?: boolean },
    actor: Actor,
  ) {
    if (!idempotencyKey || idempotencyKey.length < 8 || idempotencyKey.length > 100) {
      throw new BadRequestException('An Idempotency-Key header (8–100 characters) is required.');
    }
    let job = await this.getJobDoc(id);
    if (job.idempotencyKey === idempotencyKey) return this.serialize(job.toObject()); // repeated click
    if (job.idempotencyKey) throw new ConflictException('This batch has already been confirmed.');
    if (job.status !== 'AWAITING_CONFIRMATION') throw new ConflictException(`The batch is ${job.status} and cannot be confirmed.`);

    const applicable = (job.summary?.create ?? 0) + (job.summary?.update ?? 0);
    if (!applicable) throw new BadRequestException('There are no valid rows to apply.');
    if (Number(body.confirmRowCount) !== applicable) {
      throw new BadRequestException(`Type the number of rows that will be applied (${applicable}) to confirm.`);
    }
    if (job.template === 'MAPPED' && !body.acknowledgeColumnMapping) {
      throw new BadRequestException('This workbook is not the official template: review and acknowledge the column mapping.');
    }
    if ((job.summary?.update ?? 0) > 0 && !body.acknowledgeDiff) {
      throw new BadRequestException('Acknowledge the field-level changes to existing records.');
    }

    const claimed = await this.jobModel
      .findOneAndUpdate(
        { _id: job._id, status: 'AWAITING_CONFIRMATION', idempotencyKey: { $exists: false } },
        {
          $set: {
            status: 'COMMITTING', idempotencyKey, confirmedBy: actor.userId, confirmedAt: new Date(),
            progress: { processed: 0, created: 0, updated: 0, failed: 0, chunks: 0 },
          },
        },
        { new: true },
      )
      .exec();
    if (!claimed) {
      job = await this.getJobDoc(id);
      if (job.idempotencyKey === idempotencyKey) return this.serialize(job.toObject());
      throw new ConflictException('This batch has already been confirmed.');
    }
    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_CONFIRMED', resourceType: 'IMPORT_BATCH', resourceId: id,
      metadata: { applicable, idempotencyKey },
    });
    await this.dispatch('commit', id);
    return this.serialize(claimed.toObject());
  }

  /** Retry a systemic failure or the failed rows of a partial commit (applied rows are skipped). */
  async retryCommit(id: string, actor: Actor) {
    const job = await this.jobModel
      .findOneAndUpdate({ _id: id, status: { $in: ['COMMIT_FAILED', 'PARTIALLY_COMMITTED'] } }, { $set: { status: 'COMMITTING' } }, { new: true })
      .exec();
    if (!job) throw new ConflictException('Only failed or partially committed batches can be retried.');
    await this.rowModel.updateMany({ jobId: id, 'result.status': 'FAILED' }, { $set: { 'result.status': 'PENDING' }, $unset: { 'result.error': 1 } }).exec();
    await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_RETRY', resourceType: 'IMPORT_BATCH', resourceId: id });
    await this.dispatch('commit', id);
    return this.serialize(job.toObject());
  }

  private async withTransaction<T>(fn: (session?: ClientSession) => Promise<T>) {
    const session = await this.connection.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } catch (error: any) {
      // Standalone MongoDB (no replica set): run without a transaction.
      if (/Transaction numbers are only allowed|replica set/i.test(error?.message ?? '')) return fn(undefined);
      throw error;
    } finally {
      await session.endSession();
    }
  }

  async runCommit(id: string) {
    const job = await this.jobModel.findById(id).exec();
    if (!job || job.status !== 'COMMITTING') return;
    try {
      const departments = await this.org.resolveMany('DEPARTMENT');
      const programmes = await this.org.resolveMany('PROGRAMME');
      const code = (map: typeof departments, value: unknown) => {
        const m = typeof value === 'string' ? map.get(normalizeSource(value)) : undefined;
        return m?.status === 'APPROVED' ? m.code : undefined;
      };
      const ctx = { job, dept: (v: unknown) => code(departments, v), prog: (v: unknown) => code(programmes, v) };

      for (;;) {
        const chunk = await this.rowModel
          .find({ jobId: id, action: { $in: ['CREATE', 'UPDATE'] }, 'result.status': 'PENDING' })
          .sort({ rowNumber: 1 })
          .limit(IMPORT_CHUNK_SIZE)
          .exec();
        if (!chunk.length) break;
        let created = 0;
        let updated = 0;
        let failed = 0;
        try {
          await this.withTransaction(async (session) => {
            const creates = chunk.filter((r) => r.action === 'CREATE');
            created = await this.createInBulk(creates, ctx, session);
            updated = 0;
            for (const row of chunk.filter((r) => r.action === 'UPDATE')) {
              await this.applyRow(row, ctx, session);
              updated++;
            }
          });
        } catch {
          // Isolate the failing row(s): retry one by one, each in its own transaction.
          created = 0;
          updated = 0;
          for (const row of chunk) {
            try {
              const outcome = await this.withTransaction((session) => this.applyRow(row, ctx, session));
              if (outcome === 'CREATED') created++;
              else updated++;
            } catch (error: any) {
              failed++;
              const message = error?.code === 11000 ? 'A record with the same registration number, employee ID or email was created meanwhile.' : (error?.message ?? 'Unknown error');
              await this.rowModel.updateOne({ _id: row._id }, { $set: { result: { status: 'FAILED', error: message } } }).exec();
            }
          }
        }
        await this.jobModel.updateOne({ _id: id }, { $inc: { 'progress.processed': chunk.length, 'progress.created': created, 'progress.updated': updated, 'progress.failed': failed, 'progress.chunks': 1 } }).exec();
      }

      const fresh = await this.jobModel.findById(id).exec();
      const p = fresh!.progress!;
      fresh!.status = p.failed ? (p.created + p.updated ? 'PARTIALLY_COMMITTED' : 'COMMIT_FAILED') : 'COMMITTED';
      fresh!.committedAt = new Date();
      await fresh!.save();
      await this.audit.logAction({
        actorId: job.confirmedBy ?? job.uploadedBy, actorRole: UserRole.ADMIN, action: 'IMPORT_COMMITTED', resourceType: 'IMPORT_BATCH', resourceId: id,
        success: !p.failed, metadata: { progress: p, status: fresh!.status, isDemoData: job.isDemoData, sourceNotes: job.sourceNotes.map((n) => n.text) },
      });
    } catch (error: any) {
      this.logger.error(`Commit ${id} failed: ${error.message}`);
      await this.jobModel.updateOne({ _id: id }, { $set: { status: 'COMMIT_FAILED', failureReason: error.message } }).exec();
    }
  }

  /** Document for a new account (and student profile) from a validated row. */
  private newRecords(
    row: ImportRowDocument,
    ctx: { job: ImportJobDocument; dept: (v: unknown) => string | undefined; prog: (v: unknown) => string | undefined },
  ) {
    const { job } = ctx;
    const n = row.normalized as Record<string, any>;
    const _id = new Types.ObjectId();
    if (job.kind === 'STUDENTS') {
      return {
        user: {
          _id, fullName: n.officialName, email: n.email, passwordHash: UNUSABLE_PASSWORD, role: UserRole.STUDENT, isActive: false,
          accountStatus: 'INVITED', emailStatus: 'UNVERIFIED', isDemoData: job.isDemoData, importJobId: job.id,
        },
        profile: {
          userId: String(_id), registrationNumber: n.registrationNumber, department: ctx.dept(n.department), program: n.programme,
          programmeCode: ctx.prog(n.programme), phone: n.phone, isDemoData: job.isDemoData,
          source: { school: n.department, program: n.programme, importJobId: job.id },
          derived: n.graduationBatch || n.currentSemester
            ? { graduationBatch: n.graduationBatch, currentSemester: n.currentSemester, derivation: n.derivation, status: 'PENDING_APPROVAL', importJobId: job.id }
            : undefined,
        },
      };
    }
    return {
      user: {
        _id, fullName: n.fullName, email: n.email, passwordHash: UNUSABLE_PASSWORD, role: UserRole.FACULTY, isActive: false,
        accountStatus: 'INVITED', emailStatus: n.emailStatus, employeeId: n.employeeId, identityStatus: 'UNCONFIRMED',
        designation: n.designation, department: ctx.dept(n.department), employmentStatus: n.employmentStatus,
        isDemoData: job.isDemoData, importJobId: job.id,
        source: { department: n.department, designation: n.designation, importJobId: job.id },
      },
      profile: null,
    };
  }

  /** Creates a chunk's accounts with a few bulk writes inside the caller's transaction. */
  private async createInBulk(
    rows: ImportRowDocument[],
    ctx: { job: ImportJobDocument; dept: (v: unknown) => string | undefined; prog: (v: unknown) => string | undefined },
    session?: ClientSession,
  ) {
    if (!rows.length) return 0;
    const opts = session ? { session } : {};
    const records = rows.map((row) => ({ row, ...this.newRecords(row, ctx) }));
    await this.userModel.insertMany(records.map((r) => r.user), { ...opts, ordered: true });
    const profiles = records.map((r) => r.profile).filter(Boolean);
    if (profiles.length) await this.profileModel.insertMany(profiles, { ...opts, ordered: true });
    const now = new Date();
    await this.rowModel.bulkWrite(
      records.map((r) => ({
        updateOne: { filter: { _id: r.row._id }, update: { $set: { result: { status: 'APPLIED', userId: String(r.user._id), appliedAt: now } } } },
      })),
      opts,
    );
    return rows.length;
  }

  /** Applies one row; throws to roll the transaction back. Idempotent through result.status. */
  private async applyRow(
    row: ImportRowDocument,
    ctx: { job: ImportJobDocument; dept: (v: unknown) => string | undefined; prog: (v: unknown) => string | undefined },
    session?: ClientSession,
  ): Promise<'CREATED' | 'UPDATED'> {
    const { job } = ctx;
    const n = row.normalized as Record<string, any>;
    const opts = session ? { session } : {};
    const done = async (userId: string, outcome: 'CREATED' | 'UPDATED', before?: Record<string, unknown>) => {
      await this.rowModel
        .updateOne({ _id: row._id }, { $set: { result: { status: 'APPLIED', userId, appliedAt: new Date(), before } } }, opts)
        .exec();
      return outcome;
    };

    if (row.action === 'CREATE') {
      const { user, profile } = this.newRecords(row, ctx);
      await this.userModel.create([user], opts);
      if (profile) await this.profileModel.create([profile], opts);
      return done(String(user._id), 'CREATED');
    }

    // UPDATE: only fields marked apply (empty -> value); never blanks or overwrites.
    const userId = row.matchedUserId!;
    const changes = row.diff.filter((d) => d.apply);
    const before: Record<string, unknown> = {};
    if (job.kind === 'STUDENTS') {
      const profile = await this.profileModel.findOne({ userId }, null, opts).exec();
      if (!profile) throw new Error('Matched student profile no longer exists.');
      for (const d of changes) {
        if (d.field === 'department') {
          before.department = { source: profile.source?.school ?? null, code: profile.department ?? null };
          profile.source = { ...(profile.source ?? {}), school: n.department, importJobId: job.id };
          if (!profile.department) profile.department = ctx.dept(n.department);
        } else if (d.field === 'programme') {
          before.programme = { source: profile.source?.program ?? null, code: profile.programmeCode ?? null };
          profile.source = { ...(profile.source ?? {}), program: n.programme, importJobId: job.id };
          if (!profile.programmeCode) profile.programmeCode = ctx.prog(n.programme);
        } else if (d.field.startsWith('graduation_batch') || d.field.startsWith('current_semester')) {
          before.derived = profile.derived ?? null;
          profile.derived = {
            ...(profile.derived ?? {}), graduationBatch: n.graduationBatch, currentSemester: n.currentSemester,
            derivation: n.derivation, status: 'PENDING_APPROVAL', importJobId: job.id,
          };
        }
      }
      await profile.save(opts);
    } else {
      const user = await this.userModel.findById(userId, null, opts).exec();
      if (!user) throw new Error('Matched faculty account no longer exists.');
      for (const d of changes) {
        if (d.field === 'designation') {
          before.designation = user.designation ?? null;
          user.designation = n.designation;
        } else if (d.field === 'department') {
          before.department = { source: user.source?.department ?? null, code: user.department ?? null };
          user.source = { ...(user.source ?? {}), department: n.department, importJobId: job.id };
          if (!user.department) user.department = ctx.dept(n.department);
        }
      }
      await user.save(opts);
    }
    return done(userId, 'UPDATED', before);
  }

  /* ------------------------------------------------------------------ */
  /* Post-commit actions                                                 */
  /* ------------------------------------------------------------------ */

  async cancel(id: string, actor: Actor) {
    const job = await this.jobModel
      .findOneAndUpdate({ _id: id, status: { $in: ['AWAITING_CONFIRMATION', 'VALIDATION_FAILED'] } }, { $set: { status: 'CANCELLED' } }, { new: true })
      .exec();
    if (!job) throw new ConflictException('Only batches awaiting confirmation can be cancelled.');
    await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_CANCELLED', resourceType: 'IMPORT_BATCH', resourceId: id });
    return this.serialize(job.toObject());
  }

  async revalidate(id: string, actor: Actor) {
    const job = await this.jobModel
      .findOneAndUpdate({ _id: id, status: { $in: ['AWAITING_CONFIRMATION', 'VALIDATION_FAILED'] } }, { $set: { status: 'VALIDATING' } }, { new: true })
      .exec();
    if (!job) throw new ConflictException('Only batches that are not yet confirmed can be re-validated.');
    await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_REVALIDATE', resourceType: 'IMPORT_BATCH', resourceId: id });
    await this.dispatch('validate', id);
    return this.serialize(job.toObject());
  }

  /**
   * Reconciliation (Master Plan §8.9): accounts created by the batch and never
   * activated are deactivated and their assignments ended; activated accounts are
   * kept for manual review. Updates are restored only where unchanged since.
   */
  async revert(id: string, reason: string, actor: Actor) {
    if (!reason?.trim()) throw new BadRequestException('A reason is required.');
    const job = await this.jobModel
      .findOneAndUpdate(
        { _id: id, status: { $in: ['COMMITTED', 'PARTIALLY_COMMITTED'] }, committedAt: { $gte: new Date(Date.now() - days(REVERT_WINDOW_DAYS)) } },
        { $set: { status: 'REVERTING' } },
        { new: true },
      )
      .exec();
    if (!job) throw new ConflictException('Only committed batches from the last 14 days can be reverted.');

    let deactivated = 0;
    let kept = 0;
    let restored = 0;
    let conflicts = 0;
    const rows = await this.rowModel.find({ jobId: id, 'result.status': 'APPLIED' }).exec();
    for (const row of rows) {
      const userId = row.result!.userId!;
      if (row.action === 'CREATE') {
        const user = await this.userModel.findById(userId).exec();
        if (user && user.accountStatus === 'INVITED' && !user.lastLoginAt) {
          user.accountStatus = 'DEACTIVATED';
          user.isActive = false;
          await user.save();
          await this.endAssignments(userId, 'IMPORT_REVERTED', actor.userId);
          row.result!.status = 'REVERTED';
          deactivated++;
        } else {
          row.result!.status = 'KEPT';
          kept++;
        }
      } else {
        // Restore pre-import values for fields still holding the imported value.
        const before = row.result!.before ?? {};
        const profile = job.kind === 'STUDENTS' ? await this.profileModel.findOne({ userId }).exec() : null;
        const user = job.kind === 'FACULTY' ? await this.userModel.findById(userId).exec() : null;
        let clash = false;
        if (profile && 'derived' in before) {
          if (profile.derived?.importJobId === job.id && profile.derived?.status === 'PENDING_APPROVAL') profile.derived = (before.derived as any) ?? undefined;
          else clash = true;
        }
        if (user && 'designation' in before) {
          if (user.designation === (row.normalized as any).designation) user.designation = (before.designation as string) ?? undefined;
          else clash = true;
        }
        await profile?.save();
        await user?.save();
        row.result!.status = clash ? 'KEPT' : 'REVERTED';
        if (clash) conflicts++;
        else restored++;
      }
      await row.save();
    }
    job.status = kept || conflicts ? 'REVERT_PARTIAL' : 'REVERTED';
    job.revert = { by: actor.userId, at: new Date(), reason, deactivated, kept, restored, conflicts };
    await job.save();
    await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_REVERTED', resourceType: 'IMPORT_BATCH', resourceId: id, reason, metadata: job.revert });
    return this.serialize(job.toObject());
  }

  private async endAssignments(userId: string, reason: string, by: string) {
    await this.assignmentModel
      .updateMany(
        { status: 'ACTIVE', $or: [{ studentId: userId }, { facultyUserId: userId }] },
        { $set: { status: 'ENDED', validTo: new Date(), endedBy: by, endReason: reason } },
      )
      .exec();
  }

  /** Demo batches only: permanently removes never-activated accounts the batch created. */
  async purgeDemo(id: string, reason: string, actor: Actor) {
    if (!reason?.trim()) throw new BadRequestException('A reason is required.');
    const job = await this.getJobDoc(id);
    if (!job.isDemoData) throw new ForbiddenException('Only demo-data batches can be purged. Use revert for real data.');
    if (!['COMMITTED', 'PARTIALLY_COMMITTED', 'REVERTED', 'REVERT_PARTIAL', 'COMMIT_FAILED'].includes(job.status)) {
      throw new ConflictException(`The batch is ${job.status} and cannot be purged.`);
    }
    const users = await this.userModel
      .find({ importJobId: id, isDemoData: true, accountStatus: { $in: ['INVITED', 'DEACTIVATED'] }, lastLoginAt: { $exists: false } })
      .select('_id')
      .lean()
      .exec();
    const ids = users.map((u) => String(u._id));
    const assignments = await this.assignmentModel.deleteMany({ $or: [{ studentId: { $in: ids } }, { facultyUserId: { $in: ids } }] }).exec();
    await this.profileModel.deleteMany({ userId: { $in: ids } }).exec();
    const removed = await this.userModel.deleteMany({ _id: { $in: ids } }).exec();
    await this.rowModel.updateMany({ jobId: id, 'result.userId': { $in: ids } }, { $set: { 'result.status': 'REVERTED' } }).exec();
    job.status = 'REVERTED';
    job.revert = { by: actor.userId, at: new Date(), reason, deactivated: removed.deletedCount, kept: 0, restored: 0, conflicts: 0, purged: true };
    await job.save();
    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_DEMO_PURGED', resourceType: 'IMPORT_BATCH', resourceId: id, reason,
      metadata: { accounts: removed.deletedCount, assignments: assignments.deletedCount },
    });
    return { ...this.serialize(job.toObject()), purgedAccounts: removed.deletedCount, purgedAssignments: assignments.deletedCount };
  }

  /** Approve or reject the derived batch/semester values of this batch's students. */
  async reviewDerived(id: string, action: 'APPROVE' | 'REJECT', reason: string | undefined, actor: Actor) {
    const job = await this.getJobDoc(id);
    if (job.kind !== 'STUDENTS') throw new BadRequestException('Only student batches carry derived values.');
    if (!['COMMITTED', 'PARTIALLY_COMMITTED'].includes(job.status)) throw new ConflictException('Commit the batch first.');
    if (action === 'REJECT' && !reason?.trim()) throw new BadRequestException('A reason is required to reject.');
    const filter = { 'derived.importJobId': id, 'derived.status': 'PENDING_APPROVAL' };
    const now = new Date();
    const result =
      action === 'APPROVE'
        ? await this.profileModel
            .updateMany(filter, [
              {
                $set: {
                  batch: { $ifNull: ['$derived.graduationBatch', '$batch'] },
                  graduationYear: {
                    $cond: [{ $ifNull: ['$derived.graduationBatch', false] }, { $toInt: { $substrBytes: ['$derived.graduationBatch', 5, 4] } }, '$graduationYear'],
                  },
                  currentSemester: { $ifNull: ['$derived.currentSemester', '$currentSemester'] },
                  'derived.status': 'APPROVED', 'derived.reviewedBy': actor.userId, 'derived.reviewedAt': now,
                },
              },
            ])
            .exec()
        : await this.profileModel
            .updateMany(filter, { $set: { 'derived.status': 'REJECTED', 'derived.reviewedBy': actor.userId, 'derived.reviewedAt': now } })
            .exec();
    job.derivedReview = { status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED', by: actor.userId, at: now, reason, count: result.modifiedCount };
    await job.save();
    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role, action: `IMPORT_DERIVED_${action}D`, resourceType: 'IMPORT_BATCH', resourceId: id, reason,
      metadata: { count: result.modifiedCount, derivation: job.sourceNotes.filter((n) => /batch|semester/i.test(n.text)).map((n) => n.text) },
    });
    return { updated: result.modifiedCount, derivedReview: job.derivedReview };
  }

  /** Marks this batch's emails as confirmed (never for synthetic accounts). Invitations are released separately. */
  async confirmEmails(id: string, reason: string, actor: Actor) {
    const job = await this.getJobDoc(id);
    if (job.isDemoData) throw new ForbiddenException('Synthetic demo accounts are never verified or invited.');
    if (!reason?.trim()) throw new BadRequestException('Say how the addresses were verified.');
    const result = await this.userModel.updateMany({ importJobId: id, emailStatus: 'UNVERIFIED' }, { $set: { emailStatus: 'VERIFIED' } }).exec();
    await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_EMAILS_CONFIRMED', resourceType: 'IMPORT_BATCH', resourceId: id, reason, metadata: { count: result.modifiedCount } });
    return { verified: result.modifiedCount };
  }

  /* ------------------------------------------------------------------ */
  /* Reads, reports and templates                                        */
  /* ------------------------------------------------------------------ */

  private async getJobDoc(id: string) {
    const job = await this.jobModel.findById(id).exec();
    if (!job) throw new NotFoundException('Import batch not found');
    if (job.status === 'AWAITING_CONFIRMATION' && job.expiresAt && job.expiresAt < new Date()) {
      job.status = 'EXPIRED';
      await job.save();
    }
    return job;
  }

  private serialize(job: any) {
    const { _id, __v, fileKey, ...rest } = job;
    return { ...rest, id: String(_id) };
  }

  async list() {
    const jobs = await this.jobModel.find().sort({ createdAt: -1 }).limit(100).lean().exec();
    return jobs.map((j) => this.serialize(j));
  }

  /** Batch details plus the live status of every source value it uses. */
  async get(id: string) {
    const job = await this.getJobDoc(id);
    const [departments, programmes] = await Promise.all([
      this.rowModel.distinct('normalized.department', { jobId: id }).exec(),
      job.kind === 'STUDENTS' ? this.rowModel.distinct('normalized.programme', { jobId: id }).exec() : Promise.resolve([]),
    ]);
    const deptMap = await this.org.resolveMany('DEPARTMENT');
    const progMap = await this.org.resolveMany('PROGRAMME');
    const counts = async (field: string) =>
      new Map((await this.rowModel.aggregate([{ $match: { jobId: id } }, { $group: { _id: `$normalized.${field}`, n: { $sum: 1 } } }]).exec()).map((r) => [r._id, r.n]));
    const deptCounts = await counts('department');
    const progCounts = job.kind === 'STUDENTS' ? await counts('programme') : new Map();
    const describe = (values: string[], map: Map<string, any>, rowCounts: Map<string, number>) =>
      values.filter(Boolean).map((v) => {
        const m = map.get(normalizeSource(v));
        return { sourceValue: v, rows: rowCounts.get(v) ?? 0, mappingId: m ? String(m._id) : null, status: m?.status ?? 'PENDING', code: m?.code ?? null, suggestion: m?.suggestion ?? null };
      }).sort((a, b) => b.rows - a.rows);
    return {
      ...this.serialize(job.toObject()),
      mappings: {
        departments: describe(departments as string[], deptMap, deptCounts),
        programmes: describe(programmes as string[], progMap, progCounts),
      },
    };
  }

  async rows(id: string, q: { action?: string; issue?: string; search?: string; page?: number; limit?: number }) {
    const filter: Record<string, unknown> = { jobId: id };
    if (q.action) filter.action = q.action;
    if (q.issue === 'errors') filter['rowErrors.0'] = { $exists: true };
    if (q.issue === 'warnings') filter['warnings.0'] = { $exists: true };
    if (q.issue && !['errors', 'warnings'].includes(q.issue)) filter.$or = [{ 'warnings.code': q.issue }, { 'rowErrors.code': q.issue }];
    if (q.search) {
      const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$and = [{ $or: [{ naturalKey: rx }, { 'normalized.officialName': rx }, { 'normalized.fullName': rx }, { 'normalized.email': rx }] }];
    }
    const limit = Math.min(Math.max(Number(q.limit) || 50, 1), 200);
    const page = Math.max(Number(q.page) || 1, 1);
    const [items, total, issueCodes] = await Promise.all([
      this.rowModel.find(filter).sort({ rowNumber: 1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.rowModel.countDocuments(filter).exec(),
      this.rowModel.aggregate([{ $match: { jobId: id } }, { $project: { codes: { $concatArrays: ['$warnings.code', '$rowErrors.code'] } } }, { $unwind: '$codes' }, { $group: { _id: '$codes', n: { $sum: 1 } } }, { $sort: { n: -1 } }]).exec(),
    ]);
    return {
      items: items.map((r) => {
        const { _id, __v, ...rest } = r as any;
        return { ...rest, id: String(_id) };
      }),
      total, page, limit, issueCodes: issueCodes.map((c) => ({ code: c._id, rows: c.n })),
    };
  }

  /** Original row plus error_field/error_code/error_message, one line per issue. */
  async report(id: string, actor: Actor) {
    const job = await this.getJobDoc(id);
    const headers = job.columnMap.map((c) => c.source);
    const rows = await this.rowModel.find({ jobId: id, $or: [{ 'rowErrors.0': { $exists: true } }, { 'warnings.0': { $exists: true } }, { 'result.status': 'FAILED' }] }).sort({ rowNumber: 1 }).lean().exec();
    const out: CellValue[][] = [['row_number', ...headers, 'action', 'severity', 'error_field', 'error_code', 'error_message']];
    for (const r of rows) {
      const base = [r.rowNumber, ...headers.map((h) => safeCell((r.raw?.[h] ?? null) as CellValue))];
      const issues = [
        ...r.rowErrors.map((e) => ['ERROR', e] as const),
        ...r.warnings.map((w) => ['WARNING', w] as const),
        ...(r.result?.status === 'FAILED' ? [['ERROR', { field: '', code: 'COMMIT_FAILED', message: r.result.error ?? '' }] as const] : []),
      ];
      for (const [severity, issue] of issues) out.push([...base, r.action, severity, issue.field ?? '', issue.code, safeCell(issue.message)]);
    }
    await this.audit.logAction({ actorId: actor.userId, actorRole: actor.role, action: 'IMPORT_REPORT_DOWNLOADED', resourceType: 'IMPORT_BATCH', resourceId: id });
    return writeWorkbook([{ name: 'Issues', rows: out }, { name: 'Source notes', rows: [['sheet', 'note'], ...job.sourceNotes.map((n) => [n.sheet, n.text])] }]);
  }

  /** The official template: keys in row 1 (`*` = required), plus approved lookup codes. */
  async template(kind: ImportKind) {
    const def = TEMPLATES[kind];
    if (!def) throw new NotFoundException('Unknown template');
    const fields = def.fields.filter((f) => !f.excluded);
    const lookups = await this.org.listLookups();
    return writeWorkbook(
      [
        { name: def.sheet, rows: [fields.map((f) => `${f.key}${f.required ? '*' : ''}`)] },
        { name: 'Lookups', rows: [['type', 'code', 'name', 'department_code', 'duration_years'], ...lookups.filter((l) => l.active).map((l) => [l.type, l.code, l.name, l.departmentCode ?? '', l.durationYears ?? ''])] },
        { name: 'Notes', rows: [['Row 1 holds the column keys; * marks required columns.'], ['Department and programme values must match an approved lookup name or code.'], ['No password, role or privilege columns are accepted.']] },
      ],
      { pcTemplate: kind, pcTemplateVersion: TEMPLATE_VERSION },
    );
  }
}
