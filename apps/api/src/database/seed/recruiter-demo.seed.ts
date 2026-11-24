/**
 * Recruiter portal demonstration dataset.
 *
 *   DEMO_MODE=true pnpm --filter @placecampus/api seed:recruiter-demo
 *   DEMO_MODE=true pnpm --filter @placecampus/api reset:recruiter-demo
 *
 * Every record written here carries `isDemoData: true` and `demoDatasetId`.
 * Re-running the seed updates the same records (keyed by stable natural keys)
 * and removes demo rows that the current generator no longer produces, so the
 * dataset never accumulates duplicates. Reset deletes only tagged rows.
 *
 * Dates are generated relative to "now", so active / upcoming / completed /
 * expired drives stay correctly categorised whenever the seed is run.
 */
import * as dotenv from 'dotenv';
import { resolve } from 'node:path';
import mongoose, { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { UserRole, DriveStatus, ApplicationStatus, GrantStatus, NotificationType } from '@placecampus/shared-types';
import { UserSchema } from '../../users/schemas/user.schema.js';
import { StudentProfileSchema } from '../../students/schemas/student-profile.schema.js';
import { PlacementDriveSchema } from '../../drives/schemas/placement-drive.schema.js';
import { ApplicationSchema } from '../../applications/schemas/application.schema.js';
import { RecruiterAccessGrantSchema } from '../../recruiter-access/schemas/access-grant.schema.js';
import { RecruiterInterviewSchema } from '../../recruiter/schemas/recruiter-interview.schema.js';
import { NotificationSchema } from '../../notifications/schemas/notification.schema.js';
import { assertSafeDemoSeedTarget } from './seed-safety.js';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

const DATASET = 'recruiter-portal-demo-v1';
const RECRUITER_EMAIL = 'recruiter.demo@placecampus.local';
const OFFICER_EMAIL = 'placement.demo@placecampus.local';
const STUDENT_COUNT = 200;
const DAY = 86_400_000;
const HOUR = 3_600_000;
const write = { upsert: true, new: true, setDefaultsOnInsert: true, timestamps: false } as const;

// ---------------------------------------------------------------------------
// Deterministic pseudo-random generator: the same seed yields the same people,
// skills and outcomes on every run, so re-seeding is stable.
// ---------------------------------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
const rand = mulberry32(20_261_122);
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];
const between = (min: number, max: number) => min + rand() * (max - min);
const intBetween = (min: number, max: number) => Math.floor(between(min, max + 1));
function shuffle<T>(items: T[]) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
function weighted<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  let roll = rand() * entries.reduce((sum, [, weight]) => sum + weight, 0);
  for (const [value, weight] of entries) { roll -= weight; if (roll <= 0) return value; }
  return entries[entries.length - 1][0];
}
/** Splits `total` into whole counts proportional to `weights` (largest remainder). */
function allocate<T extends string>(total: number, weights: Partial<Record<T, number>>) {
  const entries = Object.entries(weights) as [T, number][];
  const sum = entries.reduce((acc, [, w]) => acc + w, 0);
  const raw = entries.map(([key, w]) => ({ key, exact: (total * w) / sum }));
  const result = Object.fromEntries(raw.map(({ key, exact }) => [key, Math.floor(exact)])) as Record<T, number>;
  let remaining = total - Object.values<number>(result).reduce((acc, n) => acc + n, 0);
  for (const { key } of [...raw].sort((a, b) => (b.exact % 1) - (a.exact % 1))) {
    if (remaining-- <= 0) break;
    result[key] += 1;
  }
  return result;
}
/** A weekday business-hours slot in IST (stored as UTC). */
function businessSlot(time: number) {
  const date = new Date(time);
  while ([0, 6].includes(date.getUTCDay())) date.setTime(date.getTime() + DAY);
  date.setUTCHours(intBetween(4, 10), pick([0, 30]), 0, 0); // 09:30–16:00 IST
  return date;
}

// ---------------------------------------------------------------------------
// Synthetic people
// ---------------------------------------------------------------------------
const firstNames = ['Aarav', 'Aditi', 'Aditya', 'Ananya', 'Arjun', 'Diya', 'Ishaan', 'Kavya', 'Meera', 'Neel', 'Nisha', 'Pranav', 'Riya', 'Rohan', 'Saanvi', 'Vihaan', 'Zoya', 'Ira', 'Kabir', 'Mira', 'Tanvi', 'Yash', 'Sneha', 'Harsh', 'Pooja', 'Siddharth', 'Lavanya', 'Karthik', 'Anjali', 'Varun'];
const lastNames = ['Sharma', 'Patel', 'Verma', 'Reddy', 'Nair', 'Singh', 'Iyer', 'Mehta', 'Rao', 'Gupta', 'Kulkarni', 'Menon', 'Das', 'Joshi', 'Bhat'];
const branches = [
  { name: 'Computer Science Engineering', code: 'CSE', weight: 30 },
  { name: 'Information Technology', code: 'IT', weight: 20 },
  { name: 'Electronics and Communication', code: 'ECE', weight: 18 },
  { name: 'Electrical Engineering', code: 'EE', weight: 12 },
  { name: 'Mechanical Engineering', code: 'ME', weight: 10 },
  { name: 'Civil Engineering', code: 'CE', weight: 10 },
] as const;
type BranchName = (typeof branches)[number]['name'];
const CSE = 'Computer Science Engineering', IT = 'Information Technology', ECE = 'Electronics and Communication', EE = 'Electrical Engineering';
const ALL_BRANCHES = branches.map((b) => b.name) as BranchName[];

const skillPools: Record<BranchName, string[]> = {
  'Computer Science Engineering': ['Java', 'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'MongoDB', 'Docker', 'AWS', 'Data Structures', 'Spring Boot', 'Machine Learning', 'Git'],
  'Information Technology': ['Java', 'Python', 'JavaScript', 'React', 'Node.js', 'SQL', 'HTML/CSS', 'Spring Boot', 'Linux', 'Git', 'Power BI', 'Docker'],
  'Electronics and Communication': ['C++', 'Python', 'Embedded C', 'MATLAB', 'SQL', 'Linux', 'IoT', 'Java', 'Machine Learning', 'JavaScript'],
  'Electrical Engineering': ['Python', 'MATLAB', 'C++', 'SQL', 'Power Systems', 'Excel', 'Power BI', 'Java', 'Linux'],
  'Mechanical Engineering': ['AutoCAD', 'SolidWorks', 'Python', 'Excel', 'SQL', 'Power BI', 'MATLAB', 'Java'],
  'Civil Engineering': ['AutoCAD', 'STAAD Pro', 'Excel', 'Python', 'SQL', 'Power BI', 'Project Planning'],
};
const projectTemplates: Record<BranchName, string[]> = {
  'Computer Science Engineering': ['Campus event booking platform (React, Node.js)', 'Distributed URL shortener with caching', 'Resume keyword analyser using NLP', 'Real-time chat application with WebSockets', 'Expense tracker with role-based access'],
  'Information Technology': ['Library management REST API (Spring Boot)', 'Hostel complaint portal with dashboards', 'Inventory analytics dashboard (Power BI)', 'Online quiz platform with timed tests'],
  'Electronics and Communication': ['IoT air-quality monitor with cloud dashboard', 'Gesture-controlled robot using Arduino', 'Image denoising with convolutional filters', 'Smart attendance system with RFID'],
  'Electrical Engineering': ['Solar MPPT controller simulation in MATLAB', 'Load forecasting with regression models', 'Smart energy meter prototype', 'Fault detection in transmission lines'],
  'Mechanical Engineering': ['CAD design of an electric go-kart chassis', 'Thermal analysis of a heat exchanger', 'Production line data analysis in Excel', 'Predictive maintenance model for pumps'],
  'Civil Engineering': ['Structural design of a G+3 residential building', 'Traffic flow study using survey data', 'Cost estimation tool for road projects', 'Rainwater harvesting feasibility study'],
};
const internships = ['Software engineering intern, fictional fintech startup (8 weeks)', 'Data analytics intern, fictional retail analytics firm (6 weeks)', 'Web development intern, campus incubator project (10 weeks)', 'Embedded systems intern, fictional electronics lab (8 weeks)', 'Operations analyst intern, fictional logistics company (6 weeks)', 'Cloud support intern, fictional managed-services provider (12 weeks)'];

// ---------------------------------------------------------------------------
// Fictional employers and drives
// ---------------------------------------------------------------------------
type Lifecycle = 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'EXPIRED';
const driveDefinitions: {
  company: string; industry: string; about: string; location: string; workMode: string;
  role: string; packageLabel: string; employmentType: string; lifecycle: Lifecycle;
  branches: BranchName[]; minCgpa: number; graduationYear?: number; skills: string[]; target: number;
}[] = [
  { company: 'Northstar Digital Labs', industry: 'Software Products', about: 'Builds collaboration software for mid-sized enterprises.', location: 'Bengaluru', workMode: 'HYBRID', role: 'Software Development Engineer', packageLabel: '₹14–18 LPA', employmentType: 'Full-time', lifecycle: 'ACTIVE', branches: [CSE, IT, ECE], minCgpa: 7, graduationYear: 2027, skills: ['Data Structures', 'Java', 'SQL'], target: 42 },
  { company: 'Copperleaf Analytics', industry: 'Data & Analytics', about: 'Decision-intelligence consultancy serving retail and logistics clients.', location: 'Pune', workMode: 'ONSITE', role: 'Data Analyst', packageLabel: '₹7–9 LPA', employmentType: 'Full-time', lifecycle: 'ACTIVE', branches: ALL_BRANCHES, minCgpa: 6.5, skills: ['SQL', 'Python', 'Power BI'], target: 56 },
  { company: 'Mosaic Harbor Technologies', industry: 'Digital Services', about: 'Designs web and mobile platforms for growing businesses.', location: 'Mumbai', workMode: 'HYBRID', role: 'Frontend Developer', packageLabel: '₹8–11 LPA', employmentType: 'Full-time', lifecycle: 'ACTIVE', branches: [CSE, IT, ECE, EE], minCgpa: 6.5, skills: ['JavaScript', 'React', 'HTML/CSS'], target: 46 },
  { company: 'Asterion Systems', industry: 'Enterprise AI', about: 'Automation and machine-learning platforms for manufacturing.', location: 'Hyderabad', workMode: 'ONSITE', role: 'Machine Learning Engineer', packageLabel: '₹16–20 LPA', employmentType: 'Full-time', lifecycle: 'UPCOMING', branches: [CSE, IT, ECE, EE], minCgpa: 7.5, graduationYear: 2027, skills: ['Python', 'Machine Learning', 'SQL'], target: 0 },
  { company: 'Quarryline Cloud', industry: 'Cloud Infrastructure', about: 'Cloud reliability and developer-tooling company.', location: 'Noida', workMode: 'REMOTE', role: 'DevOps Engineer', packageLabel: '₹10–13 LPA', employmentType: 'Internship to full-time', lifecycle: 'UPCOMING', branches: [CSE, IT, ECE, EE], minCgpa: 6.5, skills: ['Linux', 'Docker', 'AWS'], target: 0 },
  { company: 'Bluepeak Networks', industry: 'Telecommunications', about: 'Network infrastructure and connectivity software.', location: 'Chennai', workMode: 'ONSITE', role: 'Backend Developer', packageLabel: '₹12–15 LPA', employmentType: 'Full-time', lifecycle: 'COMPLETED', branches: [CSE, IT, ECE], minCgpa: 7, skills: ['Java', 'Spring Boot', 'SQL'], target: 44 },
  { company: 'Meridian Mobility Works', industry: 'Automotive & EV', about: 'Electric-mobility engineering and connected-vehicle software.', location: 'Pune', workMode: 'ONSITE', role: 'Java Developer', packageLabel: '₹6.5–8 LPA', employmentType: 'Full-time', lifecycle: 'COMPLETED', branches: ALL_BRANCHES, minCgpa: 6, skills: ['Java', 'SQL', 'Git'], target: 52 },
  { company: 'HelioGrid Energy', industry: 'Renewable Energy', about: 'Grid-management software for solar and wind operators.', location: 'Gurugram', workMode: 'HYBRID', role: 'Full Stack Developer', packageLabel: '₹9–12 LPA', employmentType: 'Full-time', lifecycle: 'EXPIRED', branches: [CSE, IT, ECE, EE], minCgpa: 6.5, skills: ['JavaScript', 'Node.js', 'MongoDB'], target: 44 },
];

const S = ApplicationStatus;
type Stage = 'APPLIED' | 'UNDER_REVIEW' | 'SHORTLISTED' | 'INTERVIEW_SCHEDULED' | 'OFFER_RELEASED' | 'SELECTED';
const progression: Stage[] = [S.APPLIED, S.UNDER_REVIEW, S.SHORTLISTED, S.INTERVIEW_SCHEDULED, S.OFFER_RELEASED, S.SELECTED];
/** Share of each drive's applications at each stage; depends on where the drive is in its lifecycle. */
const stageMix: Record<'ACTIVE' | 'COMPLETED' | 'EXPIRED', Partial<Record<Stage | 'REJECTED', number>>> = {
  ACTIVE: { APPLIED: 28, UNDER_REVIEW: 22, SHORTLISTED: 16, INTERVIEW_SCHEDULED: 13, OFFER_RELEASED: 4, SELECTED: 3, REJECTED: 14 },
  COMPLETED: { INTERVIEW_SCHEDULED: 5, OFFER_RELEASED: 9, SELECTED: 18, REJECTED: 68 },
  EXPIRED: { APPLIED: 8, UNDER_REVIEW: 22, SHORTLISTED: 20, INTERVIEW_SCHEDULED: 16, OFFER_RELEASED: 6, SELECTED: 4, REJECTED: 24 },
};
const screeningNotes: Record<string, string[]> = {
  APPLIED: ['Awaiting first-pass resume screen.', 'Profile received; check project depth during screening.'],
  UNDER_REVIEW: ['Good academic record; reviewing project portfolio.', 'Resume screened; verifying internship details.', 'Strong fundamentals on paper — confirm hands-on experience.'],
  SHORTLISTED: ['Clear project ownership; shortlisted for technical rounds.', 'Strong skill match against the job description.', 'Shortlisted — solid problem-solving examples in resume.'],
  INTERVIEW_SCHEDULED: ['Technical rounds in progress; confident communicator.', 'Cleared screening test; panel interview pending.'],
  OFFER_RELEASED: ['All rounds cleared. Offer letter shared; awaiting acceptance.', 'Offer released after HR round; joining date to be confirmed.'],
  SELECTED: ['Offer accepted. Onboarding documents requested.', 'Selected — strong performance across technical rounds.'],
  REJECTED: ['Skill match below the bar for this role.', 'Did not clear the technical round.', 'Profile does not meet current role requirements.', 'Communication round feedback below expectations.'],
};
const rounds = ['Technical Round 1', 'Technical Round 2', 'Managerial Round', 'HR Round'] as const;
const roundInstructions: Record<string, string> = {
  'Technical Round 1': 'Data structures and problem-solving discussion (45 min). Keep an editor ready.',
  'Technical Round 2': 'System design and project deep-dive (60 min).',
  'Managerial Round': 'Scenario-based discussion with the hiring manager (30 min).',
  'HR Round': 'Compensation, location preference and joining timeline (20 min).',
};
const feedbackComments = {
  ADVANCE: ['Clear reasoning and well-structured answers. Recommend moving forward.', 'Strong fundamentals; explained project trade-offs well.', 'Good communication and ownership mindset.'],
  HOLD: ['Adequate answers; needs more depth in core concepts.', 'Mixed performance; consider for a backup slot.'],
  DO_NOT_ADVANCE: ['Struggled with core problem-solving questions.', 'Limited understanding of own project architecture.', 'Communication was unclear under follow-up questions.'],
};

async function getModels() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const conn = mongoose.connection;
  return {
    users: conn.model('User', UserSchema) as Model<any>,
    profiles: conn.model('StudentProfile', StudentProfileSchema) as Model<any>,
    drives: conn.model('PlacementDrive', PlacementDriveSchema) as Model<any>,
    applications: conn.model('PlacementApplication', ApplicationSchema) as Model<any>,
    grants: conn.model('RecruiterAccessGrant', RecruiterAccessGrantSchema) as Model<any>,
    interviews: conn.model('RecruiterInterview', RecruiterInterviewSchema) as Model<any>,
    notifications: conn.model('Notification', NotificationSchema) as Model<any>,
  };
}

/** `$set` for defined values, `$unset` for undefined ones, so re-seeding never leaves stale fields behind. */
function setFields(fields: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ''> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) $unset[key] = '';
    else $set[key] = value;
  }
  return Object.keys($unset).length ? { $set, $unset } : { $set };
}

function assertPassword() {
  if (!process.env.DEMO_ACCOUNT_PASSWORD) throw new Error('Set DEMO_ACCOUNT_PASSWORD before seeding.');
}

/** Upserts a demo-owned account; refuses if the email belongs to a real account. */
async function upsertDemoUser(models: Awaited<ReturnType<typeof getModels>>, email: string, fields: Record<string, unknown>, createdAt: Date) {
  return models.users.findOneAndUpdate(
    { email, isDemoData: true },
    { $set: { ...fields, email, isActive: true, accountStatus: 'ACTIVE', isDemoData: true, demoDatasetId: DATASET, updatedAt: new Date() }, $setOnInsert: { mustChangePassword: false, createdAt } },
    write,
  );
}

async function seed() {
  assertSafeDemoSeedTarget();
  assertPassword();
  const models = await getModels();
  const now = Date.now();
  const passwordHash = await bcrypt.hash(process.env.DEMO_ACCOUNT_PASSWORD!, 12);

  // ---- Students (generated up front so emails can be conflict-checked) ----
  const students = Array.from({ length: STUDENT_COUNT }, (_, i) => {
    const first = firstNames[i % firstNames.length];
    const last = lastNames[(i * 7 + Math.floor(i / firstNames.length)) % lastNames.length];
    const branch = weighted(Object.fromEntries(branches.map((b) => [b.name, b.weight])) as Record<BranchName, number>);
    const code = branches.find((b) => b.name === branch)!.code;
    const graduationYear = Number(weighted({ 2026: 40, 2027: 45, 2028: 15 }));
    const cgpa = Number(Math.min(9.8, 5.9 + ((rand() + rand() + rand()) / 3) * 4).toFixed(2));
    const pool = skillPools[branch];
    const studentSkills = shuffle([...pool]).slice(0, intBetween(4, Math.min(7, pool.length)));
    const serial = String(i + 1).padStart(3, '0');
    const registrationNumber = `DEMO-${graduationYear}-${code}-${serial}`;
    return {
      fullName: `${first} ${last}`,
      email: `${first}.${last}.${serial}@example.com`.toLowerCase(),
      branch, graduationYear, cgpa, skills: studentSkills, registrationNumber,
      projects: shuffle([...projectTemplates[branch]]).slice(0, intBetween(2, 3)),
      internshipExperience: rand() < 0.42 ? [pick(internships)] : [],
      phone: `+91 90000 ${String(10000 + i).slice(-5)}`,
      registeredAt: new Date(now - intBetween(95, 240) * DAY - intBetween(0, 23) * HOUR),
    };
  });

  const reservedEmails = [RECRUITER_EMAIL, OFFICER_EMAIL, ...students.map((s) => s.email)];
  const occupied = await models.users.find({ email: { $in: reservedEmails }, isDemoData: { $ne: true } }).select('email').lean();
  if (occupied.length) throw new Error(`Refusing to overwrite existing non-demo accounts: ${occupied.map((u: any) => u.email).join(', ')}`);

  const recruiter = await upsertDemoUser(models, RECRUITER_EMAIL, { fullName: 'Demo Recruiter', passwordHash, role: UserRole.RECRUITER, companyName: 'Demo Technologies' }, new Date(now - 120 * DAY));
  const officer = await upsertDemoUser(models, OFFICER_EMAIL, { fullName: 'Demo Placement Officer', passwordHash, role: UserRole.PLACEMENT_OFFICER }, new Date(now - 200 * DAY));
  const recruiterId = String(recruiter._id);

  const studentRecords: { userId: string; data: (typeof students)[number] }[] = [];
  for (const student of students) {
    const user = await upsertDemoUser(models, student.email, { fullName: student.fullName, passwordHash, role: UserRole.STUDENT }, student.registeredAt);
    const userId = String(user._id);
    await models.profiles.findOneAndUpdate(
      { userId },
      { $set: {
        userId, registrationNumber: student.registrationNumber, phone: student.phone,
        university: 'Demonstration Institute of Technology (fictional)', department: student.branch, program: `B.Tech ${student.branch}`,
        batch: `${student.graduationYear - 4}-${student.graduationYear}`, graduationYear: student.graduationYear, cgpa: student.cgpa, backlogs: 0,
        currentSemester: student.graduationYear === 2026 ? 7 : student.graduationYear === 2027 ? 5 : 3,
        skills: student.skills, projects: student.projects, internshipExperience: student.internshipExperience,
        resumeUrl: `https://example.com/demo-resumes/${student.registrationNumber}.pdf`,
        bio: `Fictional demonstration profile — ${student.branch} student.`,
        isDemoData: true, demoDatasetId: DATASET, createdAt: student.registeredAt, updatedAt: new Date(now - intBetween(1, 30) * DAY),
      } },
      write,
    );
    studentRecords.push({ userId, data: student });
  }

  // ---- Drives and recruiter access grants ----
  const drives: { doc: any; def: (typeof driveDefinitions)[number]; opens: number; deadline: number; driveDate: number }[] = [];
  for (let i = 0; i < driveDefinitions.length; i += 1) {
    const def = driveDefinitions[i];
    const timing = {
      ACTIVE: { opens: -(28 + i * 2), deadline: 9 + i * 4, driveDate: 22 + i * 4 },
      UPCOMING: { opens: 4 + i, deadline: 32 + i * 2, driveDate: 45 + i * 2 },
      COMPLETED: { opens: -(88 - i * 2), deadline: -(48 - i * 2), driveDate: -(38 - i * 2) },
      EXPIRED: { opens: -62, deadline: -6, driveDate: 10 },
    }[def.lifecycle];
    const opens = now + timing.opens * DAY;
    const deadline = new Date(now + timing.deadline * DAY).setUTCHours(18, 29, 0, 0); // 23:59 IST
    const driveDate = now + timing.driveDate * DAY;
    const initials = def.company.split(' ').map((p) => p[0]).join('').slice(0, 2);
    const doc = await models.drives.findOneAndUpdate(
      { demoDatasetId: DATASET, companyName: def.company },
      { $set: {
        isDemoData: true, demoDatasetId: DATASET, companyName: def.company, companyIndustry: def.industry,
        companyDescription: `${def.about} Fictional employer created for demonstration purposes only.`,
        companyLogo: `https://placehold.co/96x96/fff0e8/e9570c?text=${initials}`,
        roleTitle: def.role,
        description: `${def.company} is hiring ${def.role}s for its ${def.location} team. You will work with a mentor on production-style projects, take part in code and design reviews, and own features end to end. (Demonstration job description.)`,
        location: def.location, workMode: def.workMode, package: def.packageLabel, employmentType: def.employmentType,
        applicationStart: new Date(opens).toISOString(), applicationDeadline: new Date(deadline).toISOString(), driveDate: new Date(driveDate).toISOString(),
        status: def.lifecycle === 'COMPLETED' || def.lifecycle === 'EXPIRED' ? DriveStatus.CLOSED : DriveStatus.PUBLISHED,
        demoLifecycleStatus: def.lifecycle,
        requirements: {
          minimumCGPA: def.minCgpa, maximumBacklogs: 0, graduationYear: def.graduationYear, allowedDepartments: def.branches,
          skills: def.skills.map((skillName, j) => ({ skillId: skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), skillName, minimumLevel: j === 0 ? 3 : 2, isOptional: j === 2 })),
        },
        createdBy: officer._id, createdAt: new Date(opens - 7 * DAY), updatedAt: new Date(Math.min(now, opens)),
      } },
      write,
    );
    drives.push({ doc, def, opens, deadline, driveDate });
    // One grant expires within 48 hours so the "Expiring access" KPI has data.
    // It is on an upcoming drive (no applications), so expiry never removes applicant data.
    const expiresAt = i === 4 ? now + 36 * HOUR : now + 120 * DAY;
    await models.grants.findOneAndUpdate(
      { recruiterId: recruiter._id, driveId: doc._id },
      { $set: {
        recruiterId: recruiter._id, driveId: doc._id, grantedBy: officer._id, grantedAt: new Date(opens - 5 * DAY), expiresAt: new Date(expiresAt), status: GrantStatus.ACTIVE,
        releasedFields: ['studentName', 'studentEmail', 'registrationNumber', 'department', 'graduationYear', 'cgpa', 'skills', 'projects', 'internshipExperience', 'resumeUrl', 'applicationStatus', 'skillMatchCoverage'],
        canManageApplications: true, isDemoData: true, demoDatasetId: DATASET, createdAt: new Date(opens - 5 * DAY), updatedAt: new Date(now),
      } },
      write,
    );
  }

  // Remove demo rows produced by older versions of this generator (never touches untagged records).
  const keptUserIds = [recruiter._id, officer._id, ...studentRecords.map((s) => new mongoose.Types.ObjectId(s.userId))];
  const staleUsers = await models.users.find({ demoDatasetId: DATASET, isDemoData: true, _id: { $nin: keptUserIds } }).select('_id').lean();
  if (staleUsers.length) {
    const staleIds = staleUsers.map((u: any) => String(u._id));
    await models.profiles.deleteMany({ demoDatasetId: DATASET, userId: { $in: staleIds } });
    await models.applications.deleteMany({ demoDatasetId: DATASET, studentId: { $in: staleIds } });
    await models.interviews.deleteMany({ demoDatasetId: DATASET, studentId: { $in: staleIds } });
    await models.users.deleteMany({ demoDatasetId: DATASET, isDemoData: true, _id: { $in: staleUsers.map((u: any) => u._id) } });
  }
  const keptDriveIds = drives.map((d) => d.doc._id);
  await models.grants.deleteMany({ demoDatasetId: DATASET, driveId: { $nin: keptDriveIds } });
  await models.drives.deleteMany({ demoDatasetId: DATASET, isDemoData: true, _id: { $nin: keptDriveIds } });

  // ---- Applications: eligible students only, unique per (student, drive) ----
  type AppPlan = { drive: (typeof drives)[number]; student: (typeof studentRecords)[number]; status: string; appliedAt: number; decidedAt?: number; stageIndex: number };
  const plans: AppPlan[] = [];
  for (const drive of drives) {
    if (drive.def.target === 0) continue;
    const { def } = drive;
    const eligible = studentRecords.filter(({ data }) => data.cgpa >= def.minCgpa && def.branches.includes(data.branch) && (!def.graduationYear || data.graduationYear === def.graduationYear));
    const applicants = shuffle([...eligible]).slice(0, Math.min(def.target, eligible.length));
    const counts = allocate(applicants.length, stageMix[def.lifecycle as 'ACTIVE' | 'COMPLETED' | 'EXPIRED']);
    // Weaker skill/CGPA profiles are more likely to be rejected; stronger ones progress further.
    const score = (s: (typeof studentRecords)[number]) => s.data.cgpa + s.data.skills.filter((k) => def.skills.includes(k)).length * 0.6 + rand() * 1.5;
    const ranked = applicants.map((student) => ({ student, score: score(student) })).sort((a, b) => a.score - b.score);
    const rejected = ranked.splice(0, counts.REJECTED ?? 0).map(({ student }) => student);
    const progressing = ranked.reverse().map(({ student }) => student); // strongest first
    const assignments: { student: (typeof studentRecords)[number]; status: string }[] = rejected.map((student) => ({ student, status: S.REJECTED }));
    for (const stage of [...progression].reverse()) {
      for (let n = 0; n < (counts[stage] ?? 0); n += 1) assignments.push({ student: progressing.shift()!, status: stage });
    }
    const windowEnd = Math.min(drive.deadline, now - 2 * HOUR);
    const decisionEnd = def.lifecycle === 'COMPLETED' ? Math.min(drive.driveDate + 6 * DAY, now - HOUR) : now - HOUR;
    for (const { student, status } of assignments) {
      // Earlier days of the application window get more traffic, with a final-week bump.
      const t = rand() < 0.25 ? between(0.75, 1) : Math.pow(rand(), 1.4) * 0.8;
      const appliedAt = drive.opens + t * (windowEnd - drive.opens);
      const stageIndex = status === S.REJECTED ? intBetween(1, 3) : progression.indexOf(status as Stage);
      const decidedAt = stageIndex > 0 ? appliedAt + Math.min(0.95, (stageIndex / 6) * between(0.6, 1)) * (decisionEnd - appliedAt) : undefined;
      plans.push({ drive, student, status, appliedAt, decidedAt, stageIndex });
    }
  }

  const keptApplicationIds: any[] = [];
  const appByPlan = new Map<AppPlan, any>();
  for (const plan of plans) {
    const { drive, student, status } = plan;
    const matched = drive.def.skills.map((skillName, j) => {
      const has = student.data.skills.includes(skillName);
      return { skillId: skillName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), skillName, status: has ? 'SATISFIED' : j === 2 ? 'OPTIONAL_MISSING' : rand() < 0.5 ? 'GAP' : 'MISSING' };
    });
    const required = matched.filter((_, j) => j !== 2);
    const coverage = Math.round((required.filter((m) => m.status === 'SATISFIED').length / required.length) * 1000) / 10;
    const notes = rand() < 0.65 || status !== S.APPLIED ? pick(screeningNotes[status]) : undefined;
    const lastUpdated = plan.decidedAt ?? plan.appliedAt;
    const app = await models.applications.findOneAndUpdate(
      { studentId: student.userId, driveId: String(drive.doc._id) },
      setFields({
        studentId: student.userId, driveId: String(drive.doc._id), status, appliedAt: new Date(plan.appliedAt),
        eligibilitySnapshot: { eligible: true, reasons: ['Synthetic profile meets the demonstration drive requirements'], checkedAt: new Date(plan.appliedAt) },
        matchSnapshot: { skills: matched, requiredSkillCoverage: coverage },
        readinessSnapshot: null,
        recruiterNotes: notes,
        reviewedBy: plan.decidedAt ? recruiterId : undefined,
        reviewedAt: plan.decidedAt ? new Date(plan.decidedAt) : undefined,
        rejectionReason: status === S.REJECTED ? notes : undefined,
        isDemoData: true, demoDatasetId: DATASET, createdAt: new Date(plan.appliedAt), updatedAt: new Date(lastUpdated),
      }),
      write,
    );
    keptApplicationIds.push(app._id);
    appByPlan.set(plan, app);
  }
  await models.applications.deleteMany({ demoDatasetId: DATASET, _id: { $nin: keptApplicationIds } });

  // ---- Interviews derived from each application's stage ----
  const keptInterviewIds: any[] = [];
  let interviewCount = 0;
  const upcoming: { plan: AppPlan; startsAt: Date; round: string }[] = [];
  for (const plan of plans) {
    const app = appByPlan.get(plan);
    let completedRounds = 0;
    let upcomingRound: string | undefined;
    let finalRecommendation: 'ADVANCE' | 'DO_NOT_ADVANCE' = 'ADVANCE';
    if (plan.status === S.INTERVIEW_SCHEDULED) { completedRounds = intBetween(0, 2); upcomingRound = rounds[completedRounds]; }
    else if (plan.status === S.OFFER_RELEASED || plan.status === S.SELECTED) completedRounds = 4;
    else if (plan.status === S.REJECTED && plan.stageIndex >= 3 && rand() < 0.85) { completedRounds = intBetween(1, 3); finalRecommendation = 'DO_NOT_ADVANCE'; }
    else if (plan.status === S.REJECTED && plan.stageIndex === 2 && rand() < 0.4) { completedRounds = 1; finalRecommendation = 'DO_NOT_ADVANCE'; }
    if (!completedRounds && !upcomingRound) continue;

    const startWindow = plan.appliedAt + 3 * DAY;
    const endWindow = Math.max(startWindow + DAY, Math.min(plan.decidedAt ?? now, now) - 12 * HOUR);
    const step = (endWindow - startWindow) / Math.max(1, completedRounds);
    for (let r = 0; r < completedRounds + (upcomingRound ? 1 : 0); r += 1) {
      const round = rounds[r];
      const isUpcoming = r === completedRounds && Boolean(upcomingRound);
      const startsAt = isUpcoming ? businessSlot(now + intBetween(1, 12) * DAY) : businessSlot(Math.min(startWindow + step * r, now - (completedRounds - r + 1) * 2 * DAY));
      const isLast = r === completedRounds - 1;
      const recommendation = isLast && finalRecommendation === 'DO_NOT_ADVANCE' ? 'DO_NOT_ADVANCE' : rand() < 0.1 ? 'HOLD' : 'ADVANCE';
      const scoreRange = recommendation === 'ADVANCE' ? [4, 5] : recommendation === 'HOLD' ? [3, 4] : [1, 3];
      const score = () => intBetween(scoreRange[0], scoreRange[1]);
      const interview = await models.interviews.findOneAndUpdate(
        { demoDatasetId: DATASET, applicationId: app._id, round },
        setFields({
          driveId: plan.drive.doc._id, applicationId: app._id, studentId: plan.student.userId, recruiterId, interviewerId: recruiterId,
          startsAt, round, instructions: roundInstructions[round],
          meetingUrl: `https://meet.example.com/demo/${String(app._id).slice(-8)}-${r + 1}`,
          status: isUpcoming ? 'SCHEDULED' : 'COMPLETED',
          feedback: isUpcoming ? undefined : {
            technicalKnowledge: score(), problemSolving: score(), communication: score(), projectUnderstanding: score(),
            comments: pick(feedbackComments[recommendation]), recommendation, submittedAt: new Date(startsAt.getTime() + 2 * HOUR),
          },
          isDemoData: true, demoDatasetId: DATASET,
          createdAt: new Date(isUpcoming ? now - intBetween(1, 4) * DAY : startsAt.getTime() - 3 * DAY), updatedAt: new Date(isUpcoming ? now - DAY : startsAt.getTime() + 2 * HOUR),
        }),
        write,
      );
      keptInterviewIds.push(interview._id);
      interviewCount += 1;
      if (isUpcoming) upcoming.push({ plan, startsAt, round });
    }
  }
  await models.interviews.deleteMany({ demoDatasetId: DATASET, _id: { $nin: keptInterviewIds } });

  // ---- Notifications built from the seeded events above ----
  const latest = (status: string, n: number, by: 'appliedAt' | 'decidedAt' = 'decidedAt') => plans
    .filter((p) => p.status === status && p[by] !== undefined && p[by]! <= now)
    .sort((a, b) => b[by]! - a[by]!)
    .slice(0, n);
  const label = (p: AppPlan) => `${p.drive.def.company} · ${p.drive.def.role}`;
  const notificationRows: { key: string; type: string; title: string; message: string; url: string; driveId: string; at: number }[] = [];
  const newestApps = plans.filter((p) => p.drive.def.lifecycle === 'ACTIVE').sort((a, b) => b.appliedAt - a.appliedAt).slice(0, 4);
  newestApps.forEach((p, i) => notificationRows.push({ key: `application:${i}`, type: NotificationType.APPLICATION_SUBMITTED, title: 'New student application', message: `${p.student.data.fullName} (${p.student.data.branch}) applied to ${label(p)}.`, url: `/recruiter/drives/${p.drive.doc._id}/candidates`, driveId: String(p.drive.doc._id), at: p.appliedAt }));
  latest(S.SHORTLISTED, 3).forEach((p, i) => notificationRows.push({ key: `shortlisted:${i}`, type: NotificationType.APPLICATION_STATUS_CHANGED, title: 'Candidate shortlisted', message: `${p.student.data.fullName} was shortlisted for ${label(p)}.`, url: '/recruiter/shortlists', driveId: String(p.drive.doc._id), at: p.decidedAt! }));
  upcoming.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime()).slice(0, 3).forEach((u, i) => notificationRows.push({ key: `interview:${i}`, type: NotificationType.INTERVIEW_SCHEDULED, title: 'Interview scheduled', message: `${u.round} with ${u.plan.student.data.fullName} for ${label(u.plan)} on ${u.startsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`, url: '/recruiter/interviews', driveId: String(u.plan.drive.doc._id), at: now - (i + 1) * 5 * HOUR }));
  if (upcoming[3]) notificationRows.push({ key: 'rescheduled:0', type: NotificationType.INTERVIEW_SCHEDULED, title: 'Interview rescheduled', message: `${upcoming[3].round} with ${upcoming[3].plan.student.data.fullName} moved to ${upcoming[3].startsAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at the candidate's request.`, url: '/recruiter/interviews', driveId: String(upcoming[3].plan.drive.doc._id), at: now - 26 * HOUR });
  latest(S.OFFER_RELEASED, 2).forEach((p, i) => notificationRows.push({ key: `offer:${i}`, type: NotificationType.APPLICATION_STATUS_CHANGED, title: 'Offer released', message: `An offer was released to ${p.student.data.fullName} for ${label(p)}.`, url: '/recruiter/candidates', driveId: String(p.drive.doc._id), at: p.decidedAt! }));
  latest(S.SELECTED, 2).forEach((p, i) => notificationRows.push({ key: `selected:${i}`, type: NotificationType.APPLICATION_STATUS_CHANGED, title: 'Candidate selected', message: `${p.student.data.fullName} accepted the offer for ${label(p)}.`, url: '/recruiter/candidates', driveId: String(p.drive.doc._id), at: p.decidedAt! }));
  drives.filter((d) => d.def.lifecycle === 'ACTIVE').sort((a, b) => a.deadline - b.deadline).slice(0, 2).forEach((d, i) => notificationRows.push({ key: `expiring:${i}`, type: NotificationType.DRIVE_PUBLISHED, title: 'Drive closing soon', message: `Applications for ${d.def.company} · ${d.def.role} close on ${new Date(d.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`, url: '/recruiter/drives', driveId: String(d.doc._id), at: now - (i + 1) * 3 * HOUR }));
  notificationRows.push({ key: 'access-expiring:0', type: NotificationType.DRIVE_PUBLISHED, title: 'Drive access expiring', message: `Your access to ${drives[4].def.company} · ${drives[4].def.role} expires within 48 hours.`, url: '/recruiter/drives', driveId: String(drives[4].doc._id), at: now - 2 * HOUR });

  const notificationKeys: string[] = [];
  const ordered = notificationRows.sort((a, b) => b.at - a.at);
  for (let i = 0; i < ordered.length; i += 1) {
    const row = ordered[i];
    const idempotencyKey = `${DATASET}:notification:${row.key}`;
    notificationKeys.push(idempotencyKey);
    await models.notifications.findOneAndUpdate(
      { idempotencyKey },
      { $set: { recipientId: recruiterId, type: row.type, title: row.title, message: row.message, actionUrl: row.url, entityType: 'PlacementDrive', entityId: row.driveId, readAt: i >= 5 ? new Date(row.at + HOUR) : null, idempotencyKey, isDemoData: true, demoDatasetId: DATASET, createdAt: new Date(row.at), updatedAt: new Date(row.at) } },
      write,
    );
  }
  await models.notifications.deleteMany({ demoDatasetId: DATASET, idempotencyKey: { $nin: notificationKeys } });

  const statusTotals = plans.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {});
  console.log(JSON.stringify({
    dataset: DATASET, database: mongoose.connection.name, recruiter: RECRUITER_EMAIL, password: '(value of DEMO_ACCOUNT_PASSWORD)',
    students: studentRecords.length, uniqueApplicants: new Set(plans.map((p) => p.student.userId)).size, drives: drives.length,
    applications: plans.length, applicationsByStatus: statusTotals, interviews: interviewCount, upcomingInterviews: upcoming.length, notifications: ordered.length,
  }, null, 2));
}

async function reset() {
  assertSafeDemoSeedTarget();
  const models = await getModels();
  const q = { demoDatasetId: DATASET, isDemoData: true };
  const counts = await Promise.all([
    models.notifications.deleteMany(q), models.interviews.deleteMany(q), models.applications.deleteMany(q), models.grants.deleteMany(q), models.drives.deleteMany(q), models.profiles.deleteMany(q), models.users.deleteMany(q),
  ]);
  console.log(`Removed only ${DATASET} tagged records: notifications=${counts[0].deletedCount}, interviews=${counts[1].deletedCount}, applications=${counts[2].deletedCount}, grants=${counts[3].deletedCount}, drives=${counts[4].deletedCount}, profiles=${counts[5].deletedCount}, users=${counts[6].deletedCount}.`);
}

const action = process.argv.includes('--reset') ? reset : seed;
action().catch((error) => { console.error('Recruiter demo seed failed:', error.message); process.exitCode = 1; }).finally(async () => { await mongoose.disconnect(); });
