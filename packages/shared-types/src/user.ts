// ============================================
// User & Profile Types
// ============================================

import { type UserRole } from './auth';

/**
 * Base user interface shared across all roles.
 */
export interface IUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Student academic branch/department.
 */
export enum Branch {
  CSE = 'CSE',
  IT = 'IT',
  ECE = 'ECE',
  EEE = 'EEE',
  ME = 'ME',
  CE = 'CE',
  OTHER = 'OTHER',
}

/**
 * Student profile with academic and placement details.
 */
export interface IStudentProfile {
  _id: string;
  userId: string;
  rollNumber: string;
  branch: Branch;
  graduationYear: number;
  cgpa: number;
  activeBacklogs: number;
  totalBacklogs: number;
  tenthPercentage: number;
  twelfthPercentage: number;
  phone?: string;
  resumeUrl?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  bio?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Faculty profile.
 */
export interface IFacultyProfile {
  _id: string;
  userId: string;
  department: string;
  designation: string;
  employeeId: string;
  specializations: string[];
  assignedStudentIds: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Recruiter profile tied to a company.
 */
export interface IRecruiterProfile {
  _id: string;
  userId: string;
  companyId: string;
  designation: string;
  phone?: string;
  isApproved: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Company information for recruiter association.
 */
export interface ICompany {
  _id: string;
  name: string;
  website?: string;
  industry: string;
  description?: string;
  logoUrl?: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
