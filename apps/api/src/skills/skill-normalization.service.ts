import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Skill, SkillDocument } from './schemas/skill.schema.js';
import {
  SkillEquivalence,
  SkillEquivalenceDocument,
} from './schemas/skill-equivalence.schema.js';

@Injectable()
export class SkillNormalizationService {
  private readonly logger = new Logger(SkillNormalizationService.name);

  constructor(
    @InjectModel(Skill.name) private skillModel: Model<SkillDocument>,
    @InjectModel(SkillEquivalence.name)
    private equivalenceModel: Model<SkillEquivalenceDocument>,
  ) {}

  /**
   * Normalize an input string.
   * - Trim whitespace
   * - Convert to lowercase
   */
  private normalizeString(input: string): string {
    return input.trim().toLowerCase();
  }

  /**
   * Find a canonical skill matching the input.
   * Deterministic order:
   * 1. trim
   * 2. normalize case
   * 3. exact canonical skill match
   * 4. synonym/alias match
   * 5. explicit equivalence match
   * 6. unresolved result
   */
  async normalizeSkill(input: string): Promise<SkillDocument | null> {
    const normalizedInput = this.normalizeString(input);
    if (!normalizedInput) return null;

    // 3. Exact canonical skill match
    let skill = await this.skillModel
      .findOne({ normalizedName: normalizedInput })
      .exec();

    // 4. Synonym/alias match (case-insensitive on array)
    if (!skill) {
      skill = await this.skillModel
        .findOne({
          synonyms: { $regex: new RegExp(`^${normalizedInput}$`, 'i') },
        })
        .exec();
    }

    if (skill) {
      // 5. Explicit equivalence match
      // If the matched skill has an EXACT_ALIAS mapping to another canonical skill, resolve to the other.
      // (Assuming the target skill is considered the "primary" canonical one, we'll just check if it maps to another active skill as EXACT_ALIAS)
      const equivalence = await this.equivalenceModel
        .findOne({
          $or: [{ skillId1: skill._id }, { skillId2: skill._id }],
          relationshipType: 'EXACT_ALIAS',
          active: true,
        })
        .exec();

      if (equivalence) {
        // Return the other side of the equivalence
        const targetId =
          equivalence.skillId1.toString() === skill._id.toString()
            ? equivalence.skillId2
            : equivalence.skillId1;

        const equivalentSkill = await this.skillModel.findById(targetId).exec();
        if (equivalentSkill && equivalentSkill.active) {
          return equivalentSkill;
        }
      }

      return skill;
    }

    // No match found
    this.logger.debug(`Could not normalize skill claim: "${input}"`);
    return null;
  }
}
