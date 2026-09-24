import { Injectable, Logger } from '@nestjs/common';
import { PlacementDrive } from '../drives/schemas/drive.schema.js';
import { StudentProfile } from '../students/schemas/student-profile.schema.js';

export interface EligibilityResult {
  isEligible: boolean;
  reasons: string[];
}

@Injectable()
export class EligibilityEngineService {
  private readonly logger = new Logger(EligibilityEngineService.name);

  checkEligibility(drive: PlacementDrive, student: StudentProfile): EligibilityResult {
    const reasons: string[] = [];
    let isEligible = true;

    const criteria = drive.eligibilityCriteria;

    // 1. Check CGPA
    if (student.cgpa < criteria.minimumCgpa) {
      isEligible = false;
      reasons.push(`CGPA ${student.cgpa} is below the required ${criteria.minimumCgpa}`);
    }

    // 2. Check Active Backlogs
    if (student.activeBacklogs > criteria.maximumActiveBacklogs) {
      isEligible = false;
      reasons.push(`Active backlogs (${student.activeBacklogs}) exceed the maximum allowed (${criteria.maximumActiveBacklogs})`);
    }

    // 3. Check Branch
    if (criteria.eligibleBranches && criteria.eligibleBranches.length > 0) {
      if (!criteria.eligibleBranches.includes(student.branch)) {
        isEligible = false;
        reasons.push(`Branch ${student.branch} is not eligible for this drive`);
      }
    }

    // 4. Check 10th Percentage (if specified)
    if (criteria.minimumTenthPercentage && (student.tenthPercentage ?? 0) < criteria.minimumTenthPercentage) {
      isEligible = false;
      reasons.push(`10th percentage ${student.tenthPercentage ?? 0} is below the required ${criteria.minimumTenthPercentage}`);
    }

    // 5. Check 12th Percentage (if specified)
    if (criteria.minimumTwelfthPercentage && (student.twelfthPercentage ?? 0) < criteria.minimumTwelfthPercentage) {
      isEligible = false;
      reasons.push(`12th percentage ${student.twelfthPercentage ?? 0} is below the required ${criteria.minimumTwelfthPercentage}`);
    }

    // 6. Check Graduation Year
    if (criteria.graduationYears && criteria.graduationYears.length > 0) {
      if (!criteria.graduationYears.includes(student.graduationYear)) {
        isEligible = false;
        reasons.push(`Graduation year ${student.graduationYear} is not eligible`);
      }
    }

    return {
      isEligible,
      reasons
    };
  }
}
