import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model } from 'mongoose';
import { UserRole } from '@placecampus/shared-types';
import { LookupType, OrgLookup, OrgLookupDocument } from './schemas/org-lookup.schema.js';
import { ImportMapping, ImportMappingDocument } from './schemas/import-mapping.schema.js';
import { User, UserDocument } from '../users/schemas/user.schema.js';
import {
  StudentProfile,
  StudentProfileDocument,
} from '../students/schemas/student-profile.schema.js';
import { AuditService } from '../audit/audit.service.js';

export const normalizeSource = (value: string) =>
  value.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();

/** Word overlap (Dice) between two names, 0..1 — a suggestion hint only. */
export function nameSimilarity(a: string, b: string) {
  const words = (s: string) =>
    new Set(normalizeSource(s).replace(/[^a-z0-9 ]/g, ' ').split(' ').filter((w) => w.length > 1 && !['of', 'and', 'the', 'school'].includes(w)));
  const x = words(a);
  const y = words(b);
  if (!x.size || !y.size) return 0;
  let common = 0;
  for (const w of x) if (y.has(w)) common++;
  return (2 * common) / (x.size + y.size);
}

/** A mapping as returned to the admin UI, with how many records it affects. */
export interface MappingView {
  id: string;
  type: LookupType;
  sourceValue: string;
  normalizedSource: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  code?: string;
  suggestion?: { code: string; reason: string };
  history: { action: string; code?: string; by?: string; at: Date; reason?: string }[];
  students: number;
  faculty: number;
}

export interface Actor {
  userId: string;
  role: string;
}

@Injectable()
export class OrgService {
  constructor(
    @InjectModel(OrgLookup.name) private lookupModel: Model<OrgLookupDocument>,
    @InjectModel(ImportMapping.name) private mappingModel: Model<ImportMappingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(StudentProfile.name) private profileModel: Model<StudentProfileDocument>,
    private audit: AuditService,
    @Optional() private events?: EventEmitter2,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Lookups                                                             */
  /* ------------------------------------------------------------------ */

  listLookups(type?: LookupType) {
    return this.lookupModel.find(type ? { type } : {}).sort({ type: 1, code: 1 }).lean().exec();
  }

  async createLookup(
    dto: { type: LookupType; code: string; name: string; departmentCode?: string; durationYears?: number; lateralEntry?: boolean },
    actor: Actor,
  ) {
    const code = dto.code.trim().toUpperCase();
    if (dto.type === 'PROGRAMME' && dto.departmentCode) {
      const dept = await this.lookupModel.exists({ type: 'DEPARTMENT', code: dto.departmentCode.toUpperCase(), active: true });
      if (!dept) throw new BadRequestException(`Department ${dto.departmentCode} does not exist.`);
    }
    try {
      const created = await this.lookupModel.create({ ...dto, code, createdBy: actor.userId });
      await this.audit.logAction({
        actorId: actor.userId, actorRole: actor.role, action: 'ORG_LOOKUP_CREATED',
        resourceType: 'ORG_LOOKUP', resourceId: String(created._id), metadata: { type: dto.type, code, name: dto.name },
      });
      return created.toObject();
    } catch (error: any) {
      if (error?.code === 11000) throw new ConflictException(`${dto.type} code ${code} already exists.`);
      throw error;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Source-value mappings                                               */
  /* ------------------------------------------------------------------ */

  /**
   * Makes sure every source value has a mapping record. Exact (case-insensitive)
   * name matches to an *approved, active* lookup are applied automatically;
   * everything else stays PENDING with at most a suggestion.
   * `programmeHints` (department mappings only): school -> programme values seen with it.
   */
  async ensureMappings(type: LookupType, sourceValues: string[], programmeHints?: Map<string, Set<string>>) {
    const lookups = await this.lookupModel.find({ type, active: true }).lean().exec();
    const programmeLookups =
      type === 'DEPARTMENT' ? await this.lookupModel.find({ type: 'PROGRAMME', active: true }).lean().exec() : [];
    const unique = [...new Map(sourceValues.filter(Boolean).map((v) => [normalizeSource(v), v])).values()];

    for (const value of unique) {
      const key = normalizeSource(value);
      const existing = await this.mappingModel.findOne({ type, normalizedSource: key }).exec();
      if (existing && existing.status !== 'PENDING') continue;

      const exact = lookups.find((l) => normalizeSource(l.name) === key || normalizeSource(l.code) === key);
      const mapping = existing ?? new this.mappingModel({ type, sourceValue: value, normalizedSource: key, history: [] });
      if (exact) {
        mapping.status = 'APPROVED';
        mapping.code = exact.code;
        mapping.suggestion = undefined;
        mapping.history.push({ action: 'AUTO_EXACT', code: exact.code, at: new Date(), reason: 'Exact match to an approved lookup name' });
      } else {
        const suggestion = this.suggest(type, value, lookups, programmeLookups, programmeHints?.get(value));
        if (suggestion && suggestion.code !== mapping.suggestion?.code) {
          mapping.suggestion = suggestion;
          mapping.history.push({ action: 'SUGGESTED', code: suggestion.code, at: new Date(), reason: suggestion.reason });
        }
      }
      await mapping.save();
    }
  }

  private suggest(
    type: LookupType,
    value: string,
    lookups: OrgLookup[],
    programmeLookups: OrgLookup[],
    programmes?: Set<string>,
  ): { code: string; reason: string } | null {
    if (type === 'DEPARTMENT' && programmes?.size) {
      // Programme information can *suggest* a department; it never maps one.
      for (const p of programmes) {
        const prog = programmeLookups.find((l) => normalizeSource(l.name) === normalizeSource(p));
        if (prog?.departmentCode) {
          return { code: prog.departmentCode, reason: `Programme "${p}" belongs to department ${prog.departmentCode}` };
        }
      }
    }
    let best: { code: string; score: number } | null = null;
    for (const l of lookups) {
      const score = nameSimilarity(value, l.name);
      if (score >= 0.6 && (!best || score > best.score)) best = { code: l.code, score };
    }
    return best ? { code: best.code, reason: `Similar name (${Math.round(best.score * 100)}% word overlap)` } : null;
  }

  /** Approved code for a source value, or null when unresolved. */
  async resolve(type: LookupType, value: string | null | undefined) {
    if (!value) return null;
    const m = await this.mappingModel
      .findOne({ type, normalizedSource: normalizeSource(value), status: 'APPROVED' })
      .lean()
      .exec();
    return m?.code ?? null;
  }

  async resolveMany(type: LookupType) {
    const all = await this.mappingModel.find({ type }).lean().exec();
    return new Map(all.map((m) => [m.normalizedSource, m]));
  }

  async listMappings(type?: LookupType): Promise<MappingView[]> {
    const mappings = await this.mappingModel.find(type ? { type } : {}).sort({ type: 1, status: 1, sourceValue: 1 }).lean().exec();
    // How many records each source value affects.
    const [schools, programmes, facultyDepts] = await Promise.all([
      this.profileModel.aggregate([{ $match: { 'source.school': { $type: 'string' } } }, { $group: { _id: '$source.school', n: { $sum: 1 } } }]).exec(),
      this.profileModel.aggregate([{ $match: { 'source.program': { $type: 'string' } } }, { $group: { _id: '$source.program', n: { $sum: 1 } } }]).exec(),
      this.userModel.aggregate([{ $match: { 'source.department': { $type: 'string' } } }, { $group: { _id: '$source.department', n: { $sum: 1 } } }]).exec(),
    ]);
    const count = (rows: { _id: string; n: number }[]) => new Map(rows.map((r) => [normalizeSource(r._id), r.n]));
    const s = count(schools);
    const p = count(programmes);
    const f = count(facultyDepts);
    return mappings.map((m) => ({
      type: m.type,
      sourceValue: m.sourceValue,
      normalizedSource: m.normalizedSource,
      status: m.status,
      code: m.code,
      suggestion: m.suggestion,
      history: m.history,
      id: String(m._id),
      students: m.type === 'DEPARTMENT' ? (s.get(m.normalizedSource) ?? 0) : (p.get(m.normalizedSource) ?? 0),
      faculty: m.type === 'DEPARTMENT' ? (f.get(m.normalizedSource) ?? 0) : 0,
    }));
  }

  /**
   * Approve (map to an existing active lookup) or reject a source value, then
   * apply the result to records already imported from that value.
   */
  async decideMapping(
    id: string,
    decision: { action: 'APPROVE' | 'REJECT' | 'RESET'; code?: string; reason?: string },
    actor: Actor,
  ) {
    const mapping = await this.mappingModel.findById(id).exec();
    if (!mapping) throw new NotFoundException('Mapping not found');
    let code: string | undefined;
    if (decision.action === 'APPROVE') {
      code = decision.code?.trim().toUpperCase();
      if (!code) throw new BadRequestException('Choose the code to map to.');
      const lookup = await this.lookupModel.exists({ type: mapping.type, code, active: true });
      if (!lookup) throw new BadRequestException(`${mapping.type} ${code} does not exist or is inactive.`);
    } else if (!decision.reason?.trim()) {
      throw new BadRequestException('A reason is required.');
    }

    const previous = mapping.code;
    mapping.status = decision.action === 'APPROVE' ? 'APPROVED' : decision.action === 'REJECT' ? 'REJECTED' : 'PENDING';
    mapping.code = code;
    mapping.history.push({
      action: decision.action === 'APPROVE' ? 'APPROVED' : decision.action === 'REJECT' ? 'REJECTED' : 'RESET',
      code, by: actor.userId, at: new Date(), reason: decision.reason,
    });
    await mapping.save();

    const applied = await this.applyMapping(mapping.type, mapping.sourceValue, code ?? null);
    // Students/faculty who just received a department can now get a mentor.
    if (mapping.type === 'DEPARTMENT' && (applied.students || applied.faculty)) {
      this.events?.emit('org.mapping_applied', { type: mapping.type, code: code ?? null, applied });
    }
    await this.audit.logAction({
      actorId: actor.userId, actorRole: actor.role, action: `ORG_MAPPING_${decision.action}`,
      resourceType: 'IMPORT_MAPPING', resourceId: String(mapping._id), reason: decision.reason,
      metadata: { type: mapping.type, sourceValue: mapping.sourceValue, from: previous ?? null, to: code ?? null, applied },
    });
    return { ...mapping.toObject(), id: String(mapping._id), applied };
  }

  /** Writes the mapped code onto imported records whose source text matches. */
  async applyMapping(type: LookupType, sourceValue: string, code: string | null) {
    const exact = new RegExp(`^\\s*${sourceValue.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\s*$`, 'i');
    if (type === 'DEPARTMENT') {
      const update = code ? { $set: { department: code } } : { $unset: { department: 1 } };
      const students = await this.profileModel.updateMany({ 'source.school': exact }, update).exec();
      const faculty = await this.userModel
        .updateMany({ 'source.department': exact, $or: [{ role: UserRole.FACULTY }, { roles: UserRole.FACULTY }] }, update)
        .exec();
      return { students: students.modifiedCount, faculty: faculty.modifiedCount };
    }
    const update = code ? { $set: { programmeCode: code } } : { $unset: { programmeCode: 1 } };
    const students = await this.profileModel.updateMany({ 'source.program': exact }, update).exec();
    return { students: students.modifiedCount, faculty: 0 };
  }
}
