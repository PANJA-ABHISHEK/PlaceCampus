/**
 * Showcase student seed: creates "Abhishek Panja", a final-year CSE student
 * with a complete, realistic history for classroom demos.
 *
 * Everything goes through the real services wherever the app has one, so the
 * derived data (skill claims, skill profile, readiness, matches, eligibility,
 * preparation plans, notifications) is produced by the app's own logic:
 *
 *   evidence  -> real PDF stored via StorageService, text extracted by
 *                DocumentExtractorService, rules run by VerificationEngine,
 *                approved by the demo faculty through FacultyService
 *   tests     -> AssessmentsService start + submit (server-side scoring)
 *   drives    -> DrivesService create + publish (demo placement officer)
 *   applying  -> ApplicationsService (eligibility + match snapshots)
 *   prep plan -> PreparationService (gap analysis against a drive)
 *   interview -> InterviewsService createSlot + bookSlot (upcoming one)
 *
 * Two things have no service path and are written directly:
 *   - past, completed mock interviews (the service only evaluates inside the
 *     live time window), followed by the same `interview.evaluated` event;
 *   - skill levels: the pipeline records every verified skill at level 1, so
 *     levels are set from how much verified evidence backs each skill.
 *
 * Timestamps are moved back to a believable timeline (Aug 2025 to Nov 2026).
 * Re-running the seed deletes and recreates only this student's data.
 *
 * Run from apps/api:  pnpm seed:showcase
 */
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '../../.env') });

import { configureMongoDns } from '../../config/dns.config.js';
configureMongoDns();

import { AppModule } from '../../app.module.js';
import { UserRole, EvidenceStatus } from '@placecampus/shared-types';
import { User } from '../../users/schemas/user.schema.js';
import { StudentProfile } from '../../students/schemas/student-profile.schema.js';
import { Evidence } from '../../evidence/schemas/evidence.schema.js';
import { VerificationRecord } from '../../verification/schemas/verification-record.schema.js';
import { Skill } from '../../skills/schemas/skill.schema.js';
import { SkillClaim } from '../../skills/schemas/skill-claim.schema.js';
import { StudentSkillProfile } from '../../skills/schemas/student-skill-profile.schema.js';
import { Assessment } from '../../assessments/schemas/assessment.schema.js';
import { AssessmentAttempt } from '../../assessments/schemas/assessment-attempt.schema.js';
import { MockInterview } from '../../interviews/schemas/mock-interview.schema.js';
import { InterviewSlot } from '../../interviews/schemas/interview-slot.schema.js';
import { PlacementDrive } from '../../drives/schemas/placement-drive.schema.js';
import { PlacementApplication } from '../../applications/schemas/application.schema.js';
import { PreparationPlan } from '../../preparation/schemas/preparation-plan.schema.js';
import { ReadinessSnapshot } from '../../readiness/schemas/readiness-snapshot.schema.js';
import { Notification } from '../../notifications/schemas/notification.schema.js';
import { StudentsService } from '../../students/students.service.js';
import { StorageService } from '../../storage/storage.service.js';
import { DocumentExtractorService } from '../../verification/providers/document-extractor.service.js';
import { VerificationEngineService } from '../../verification/providers/verification-engine.service.js';
import { FacultyService } from '../../faculty/faculty.service.js';
import { ReviewAction } from '../../faculty/dto/review-decision.dto.js';
import { ReadinessService } from '../../readiness/readiness.service.js';
import { AssessmentsService } from '../../assessments/assessments.service.js';
import { DrivesService } from '../../drives/drives.service.js';
import { ApplicationsService } from '../../applications/applications.service.js';
import { PreparationService } from '../../preparation/preparation.service.js';
import { InterviewsService } from '../../interviews/interviews.service.js';

const STUDENT = {
  email: 'abhishek@demo.com',
  fullName: 'Abhishek Panja',
};
const FACULTY_EMAIL = 'faculty.demo@placecampus.local';
const OFFICER_EMAIL = 'placement.demo@placecampus.local';
const ASSET_DIR = resolve(process.cwd(), 'src/database/seed/assets/showcase-student');
const AI_MODEL = process.env.AI_MODEL || 'gpt-4';

const d = (iso: string) => new Date(iso);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Evidence: each item has a real PDF in ./assets/showcase-student
// ---------------------------------------------------------------------------
interface EvidenceSeed {
  key: string;
  title: string;
  description: string;
  type: string;
  issuer: string;
  issuedDate: string;
  externalUrl?: string;
  file: string;
  claimedSkills: string[];
  confidence: number;
  aiReasons: string[];
  reviewedOn?: string; // undefined = still waiting for faculty review
  facultyNote?: string;
}

const EVIDENCE: EvidenceSeed[] = [
  {
    key: 'fullstack',
    title: 'Full-Stack Web Development Bootcamp',
    description:
      '16-week, 240-hour bootcamp covering JavaScript, React, Node.js, Express.js REST APIs and MongoDB. Final grade A (92%).',
    type: 'CERTIFICATION',
    issuer: 'CodeCraft Academy',
    issuedDate: '2025-08-14',
    file: 'fullstack-bootcamp-certificate.pdf',
    claimedSkills: ['React', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript', 'HTML', 'CSS'],
    confidence: 0.93,
    aiReasons: [
      'Recipient name on the certificate matches the student profile.',
      'Issuer name, certificate ID and issue date are clearly present.',
      'Course content lists React, Node.js, Express.js and MongoDB.',
    ],
    reviewedOn: '2025-08-18T10:20:00+05:30',
    facultyNote: 'Certificate ID cross-checked with the issuer. Approved.',
  },
  {
    key: 'attendance',
    title: 'Smart Attendance System using Face Recognition',
    description:
      'Semester 5 mini project: automatic classroom attendance from a camera feed with 94.6% recognition accuracy. Built with Python, OpenCV, k-NN face embeddings and MySQL.',
    type: 'PROJECT',
    issuer: 'PlaceCampus Institute of Technology',
    issuedDate: '2025-11-15',
    externalUrl: 'https://github.com/PANJA-ABHISHEK',
    file: 'smart-attendance-project-report.pdf',
    claimedSkills: ['Python', 'Machine Learning', 'SQL'],
    confidence: 0.9,
    aiReasons: [
      'Project certificate is issued by the student’s department and signed by the coordinator.',
      'Technology stack names Python, machine learning and SQL.',
    ],
    reviewedOn: '2025-11-20T15:05:00+05:30',
  },
  {
    key: 'python-ml',
    title: 'Python for Data Science & Machine Learning',
    description:
      '60-hour course with 8 graded labs: Python, NumPy, pandas, SQL for analytics and supervised machine learning with scikit-learn.',
    type: 'CERTIFICATION',
    issuer: 'DataSpring Learning',
    issuedDate: '2025-12-05',
    file: 'python-ml-certificate.pdf',
    claimedSkills: ['Python', 'Machine Learning', 'SQL'],
    confidence: 0.91,
    aiReasons: [
      'Recipient name and certificate ID are present and consistent.',
      'Course covers Python, SQL and supervised machine learning.',
    ],
    reviewedOn: '2025-12-09T11:40:00+05:30',
  },
  {
    key: 'cloud',
    title: 'Cloud Foundations & DevOps Essentials',
    description:
      'Proctored practical certification in AWS core services, Linux administration, Git workflows, Docker and CI/CD. Score: 84%.',
    type: 'CERTIFICATION',
    issuer: 'CloudSkills Institute',
    issuedDate: '2026-02-20',
    file: 'cloud-devops-certificate.pdf',
    claimedSkills: ['AWS', 'Docker', 'Linux', 'Git'],
    confidence: 0.88,
    aiReasons: [
      'Certificate shows a proctored exam score of 84%.',
      'Skills listed: AWS, Linux, Git and Docker.',
    ],
    reviewedOn: '2026-02-24T09:55:00+05:30',
  },
  {
    key: 'hackathon',
    title: 'HackNova 2026: 1st Runner-up',
    description:
      'Ranked 2nd of 214 teams (63 colleges) for "CampusConnect", a real-time placement assistant built with React, Node.js, Express.js and MongoDB in 36 hours.',
    type: 'HACKATHON',
    issuer: 'HackNova National Student Hackathon',
    issuedDate: '2026-03-15',
    file: 'hacknova-runner-up-certificate.pdf',
    claimedSkills: ['React', 'Node.js', 'Express.js', 'MongoDB', 'JavaScript'],
    confidence: 0.89,
    aiReasons: [
      'Certificate states the rank (2nd of 214 teams) and the event date.',
      'Project description names React, Node.js and MongoDB.',
    ],
    reviewedOn: '2026-03-19T14:30:00+05:30',
    facultyNote: 'Result confirmed on the event’s published winners list.',
  },
  {
    key: 'grade-card',
    title: 'B.Tech Semester VI Grade Card (SGPA 9.02)',
    description:
      'Official semester VI grade card: SGPA 9.02, CGPA 8.74, 20/20 credits, no backlogs. First Class with Distinction.',
    type: 'ACADEMIC',
    issuer: 'PlaceCampus Institute of Technology',
    issuedDate: '2026-07-10',
    file: 'semester-6-grade-card.pdf',
    claimedSkills: [],
    confidence: 0.95,
    aiReasons: ['Official grade card with roll number, SGPA and CGPA.'],
    reviewedOn: '2026-07-14T12:10:00+05:30',
    facultyNote: 'Matches the university examination records.',
  },
  {
    key: 'internship',
    title: 'Software Development Intern, Brightwave Software Solutions',
    description:
      'Two-month internship (June to July 2026) with the Platform Engineering team: Java and Spring Boot REST APIs, SQL query optimisation and Git-based code reviews.',
    type: 'INTERNSHIP',
    issuer: 'Brightwave Software Solutions',
    issuedDate: '2026-07-31',
    file: 'brightwave-internship-letter.pdf',
    claimedSkills: ['Java', 'Spring Boot', 'SQL', 'Git', 'REST API'],
    confidence: 0.92,
    aiReasons: [
      'Completion letter on company letterhead with reference number and signatory.',
      'Work described uses Java, Spring Boot, SQL and REST APIs.',
    ],
    reviewedOn: '2026-08-04T16:45:00+05:30',
    facultyNote: 'Confirmed with the company HR contact.',
  },
  {
    key: 'placecampus',
    title: 'PlaceCampus: Placement & Student Readiness Platform',
    description:
      'Final-year major project. Evidence verification with faculty review, explainable readiness scoring, drive matching and preparation plans. Next.js, TypeScript, Tailwind CSS, NestJS and MongoDB.',
    type: 'PROJECT',
    issuer: 'PlaceCampus Institute of Technology',
    issuedDate: '2026-10-20',
    externalUrl: 'https://github.com/PANJA-ABHISHEK/PlaceCampus',
    file: 'placecampus-project-report.pdf',
    claimedSkills: ['Next.js', 'TypeScript', 'React', 'Node.js', 'MongoDB', 'Tailwind CSS', 'REST API', 'JavaScript', 'HTML', 'CSS', 'Git'],
    confidence: 0.94,
    aiReasons: [
      'Project certificate signed by the project guide, with evaluation marks (46/50).',
      'Repository link and technology stack are listed.',
    ],
    reviewedOn: '2026-10-22T11:15:00+05:30',
    facultyNote: 'Reviewed the live demo and repository. Excellent work.',
  },
  {
    key: 'dsa',
    title: 'Data Structures & Algorithms in C++',
    description:
      '12-week DSA course in C++: trees, graphs, heaps, hashing, dynamic programming and greedy algorithms, with 180+ solved problems.',
    type: 'CERTIFICATION',
    issuer: 'AlgoPrep Academy',
    issuedDate: '2026-10-28',
    file: 'dsa-cpp-certificate.pdf',
    claimedSkills: ['Data Structures', 'Algorithms', 'C++'],
    confidence: 0.87,
    aiReasons: [
      'Recipient name matches and the certificate ID is present.',
      'Course content covers data structures and algorithms in C++.',
    ],
    // Left for faculty review so it can be approved live in a demo.
  },
];

const DOCUMENT_TYPE: Record<string, string> = {
  CERTIFICATION: 'Course completion certificate',
  PROJECT: 'Project evaluation certificate',
  INTERNSHIP: 'Internship completion letter',
  HACKATHON: 'Hackathon award certificate',
  ACADEMIC: 'Official grade card',
};

/**
 * Proficiency (1-5) grows with the amount of verified evidence behind a skill:
 * one item gives level 3, two or more reach the skill's cap.
 */
const LEVEL_CAP: Record<string, number> = {
  React: 4, 'Node.js': 4, JavaScript: 4, MongoDB: 4, HTML: 4, SQL: 4, Git: 4,
  'Express.js': 3, CSS: 3, Python: 3, 'Machine Learning': 3, AWS: 3, Docker: 3,
  Linux: 3, Java: 3, 'Spring Boot': 3, 'REST API': 3, 'Next.js': 3,
  TypeScript: 3, 'Tailwind CSS': 3,
};

// ---------------------------------------------------------------------------
// Assessments (shared catalogue, upserted by title)
// ---------------------------------------------------------------------------
type Q = [question: string, options: string[], answer: number, explanation: string];

const ASSESSMENTS: { title: string; description: string; skill: string; difficulty: number; duration: number; questions: Q[] }[] = [
  {
    title: 'JavaScript Fundamentals',
    description: 'Core JavaScript: scope, closures, the event loop, promises and modern ES features.',
    skill: 'JavaScript', difficulty: 2, duration: 20,
    questions: [
      ['What does `typeof null` return?', ['"null"', '"object"', '"undefined"', '"number"'], 1, 'A long-standing quirk: typeof null is "object".'],
      ['Which keyword declares a block-scoped variable that cannot be reassigned?', ['var', 'let', 'const', 'static'], 2, 'const is block-scoped and cannot be reassigned.'],
      ['What is printed by `console.log(0.1 + 0.2 === 0.3)`?', ['true', 'false', 'undefined', 'TypeError'], 1, 'Floating-point rounding makes the sum 0.30000000000000004.'],
      ['Which method creates a new array with the results of calling a function on every element?', ['forEach()', 'map()', 'filter()', 'reduce()'], 1, 'map() returns a new array of transformed values.'],
      ['What is a closure?', ['A function bundled with references to its surrounding scope', 'A way to close a browser window', 'An object without a prototype', 'A syntax error'], 0, 'Closures keep access to variables from the outer scope.'],
      ['Which runs first: a resolved Promise callback or a setTimeout(fn, 0) callback?', ['setTimeout callback', 'Promise callback', 'They run at the same time', 'It is random'], 1, 'Microtasks (promises) run before macrotasks (timers).'],
      ['What does the `===` operator compare?', ['Value only', 'Type only', 'Value and type', 'Memory address only'], 2, 'Strict equality compares value and type without coercion.'],
      ['Which statement about arrow functions is true?', ['They have their own `this`', 'They inherit `this` from the enclosing scope', 'They can be used as constructors', 'They always return undefined'], 1, 'Arrow functions capture this lexically.'],
      ['What does `Array.prototype.includes` return?', ['The index of the element', 'A boolean', 'The element itself', 'A new array'], 1, 'includes() returns true or false.'],
      ['What is the output of `[...new Set([1, 1, 2, 3])]`?', ['[1, 1, 2, 3]', '[1, 2, 3]', '[3]', 'Set {1, 2, 3}'], 1, 'A Set removes duplicates; spreading turns it back into an array.'],
    ],
  },
  {
    title: 'Data Structures & Algorithms Basics',
    description: 'Complexity analysis, arrays, stacks, queues, trees, hashing and sorting.',
    skill: 'Data Structures', difficulty: 3, duration: 30,
    questions: [
      ['What is the time complexity of binary search on a sorted array?', ['O(n)', 'O(log n)', 'O(n log n)', 'O(1)'], 1, 'The search space halves each step.'],
      ['Which data structure follows Last-In, First-Out (LIFO)?', ['Queue', 'Stack', 'Heap', 'Graph'], 1, 'A stack removes the most recently added item first.'],
      ['What is the average lookup time in a well-distributed hash table?', ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], 0, 'Hashing gives constant average-time lookup.'],
      ['Which traversal of a binary search tree visits nodes in sorted order?', ['Pre-order', 'In-order', 'Post-order', 'Level-order'], 1, 'In-order traversal of a BST yields sorted keys.'],
      ['What is the worst-case time complexity of quicksort?', ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'], 2, 'Poor pivot choices lead to O(n²).'],
      ['Which algorithm finds the shortest path in a graph with non-negative edge weights?', ['Kruskal’s', 'Dijkstra’s', 'Prim’s', 'DFS'], 1, 'Dijkstra’s algorithm handles non-negative weights.'],
      ['A queue is best implemented for O(1) enqueue and dequeue using:', ['A singly linked list with head and tail pointers', 'A sorted array', 'A binary search tree', 'A hash map only'], 0, 'Head and tail pointers give O(1) operations at both ends.'],
      ['Which technique stores results of subproblems to avoid recomputation?', ['Greedy', 'Divide and conquer', 'Dynamic programming', 'Backtracking'], 2, 'Dynamic programming memoises or tabulates subproblems.'],
      ['What is the height of a balanced binary tree with n nodes?', ['O(n)', 'O(log n)', 'O(√n)', 'O(1)'], 1, 'Balanced trees keep height logarithmic.'],
      ['Which data structure is used to implement a priority queue efficiently?', ['Stack', 'Linked list', 'Heap', 'Array of arrays'], 2, 'A binary heap gives O(log n) insert and extract.'],
    ],
  },
  {
    title: 'SQL & Database Essentials',
    description: 'Queries, joins, aggregation, indexing, normalisation and transactions.',
    skill: 'SQL', difficulty: 2, duration: 20,
    questions: [
      ['Which clause filters rows after aggregation?', ['WHERE', 'HAVING', 'GROUP BY', 'ORDER BY'], 1, 'HAVING filters grouped results.'],
      ['Which join returns only rows with matching values in both tables?', ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN'], 2, 'INNER JOIN keeps only matches.'],
      ['What does a PRIMARY KEY guarantee?', ['Values are unique and not null', 'Values are sorted', 'Values are encrypted', 'Values can repeat'], 0, 'A primary key is unique and non-null.'],
      ['Which normal form removes partial dependencies on a composite key?', ['1NF', '2NF', '3NF', 'BCNF'], 1, '2NF removes partial dependencies.'],
      ['What does the "A" in ACID stand for?', ['Availability', 'Atomicity', 'Accuracy', 'Aggregation'], 1, 'Atomicity: a transaction happens fully or not at all.'],
      ['Which statement removes all rows but keeps the table structure, usually without logging each row?', ['DELETE', 'DROP', 'TRUNCATE', 'REMOVE'], 2, 'TRUNCATE empties the table quickly.'],
      ['What is the main benefit of an index?', ['Saves disk space', 'Speeds up reads on indexed columns', 'Prevents duplicate rows automatically', 'Encrypts data'], 1, 'Indexes speed up lookups at some write cost.'],
      ['Which function counts non-null values in a column?', ['SUM(col)', 'COUNT(col)', 'COUNT(*)', 'LEN(col)'], 1, 'COUNT(col) ignores nulls; COUNT(*) counts rows.'],
      ['What does `SELECT DISTINCT department FROM students` return?', ['All rows', 'Unique department values', 'The first department', 'An error'], 1, 'DISTINCT removes duplicate values.'],
      ['Which isolation problem occurs when a transaction reads uncommitted changes of another?', ['Phantom read', 'Dirty read', 'Lost update', 'Deadlock'], 1, 'Reading uncommitted data is a dirty read.'],
    ],
  },
  {
    title: 'React Essentials',
    description: 'Components, props, state, hooks, rendering behaviour and performance basics.',
    skill: 'React', difficulty: 3, duration: 25,
    questions: [
      ['Which hook adds local state to a function component?', ['useEffect', 'useState', 'useMemo', 'useRef'], 1, 'useState returns a state value and setter.'],
      ['When does a `useEffect` with an empty dependency array run?', ['On every render', 'Once after the first render', 'Never', 'Only on unmount'], 1, 'An empty array runs the effect after mount only.'],
      ['Why should list items have a stable `key` prop?', ['For styling', 'So React can match items between renders', 'To make items focusable', 'It is optional and has no effect'], 1, 'Keys let React reconcile list items correctly.'],
      ['Props in React are:', ['Mutable by the child', 'Read-only inputs passed from the parent', 'Global variables', 'Only strings'], 1, 'Children must not mutate props.'],
      ['Which hook memoises an expensive computed value?', ['useCallback', 'useMemo', 'useReducer', 'useContext'], 1, 'useMemo caches a computed value between renders.'],
      ['What does `useRef` return?', ['A state setter', 'A mutable object whose .current persists across renders', 'A DOM event', 'A promise'], 1, 'Refs persist without causing re-renders.'],
      ['How do you share data across many components without prop drilling?', ['Context API', 'Inline styles', 'Fragments', 'Portals'], 0, 'Context provides values to a component subtree.'],
      ['What causes a component to re-render?', ['A change in its state or props', 'Hovering over it', 'Reading a ref', 'Calling console.log'], 0, 'State or prop changes (or parent re-renders) trigger renders.'],
      ['Which is the correct way to update state based on the previous state?', ['setCount(count++)', 'setCount(prev => prev + 1)', 'count = count + 1', 'this.count += 1'], 1, 'The functional updater uses the latest state.'],
      ['What is JSX?', ['A database', 'A syntax extension that compiles to React.createElement calls', 'A CSS framework', 'A testing tool'], 1, 'JSX is syntax sugar for creating React elements.'],
    ],
  },
];

/** Which questions Abhishek answers correctly in each attempt (0-based indexes he gets wrong). */
const ATTEMPTS: { title: string; wrong: number[]; at: string; minutes: number }[] = [
  { title: 'JavaScript Fundamentals', wrong: [5], at: '2026-04-10T19:10:00+05:30', minutes: 14 },
  { title: 'Data Structures & Algorithms Basics', wrong: [4, 6, 8, 9], at: '2026-05-12T20:05:00+05:30', minutes: 27 },
  { title: 'SQL & Database Essentials', wrong: [3], at: '2026-08-20T18:40:00+05:30', minutes: 16 },
  { title: 'React Essentials', wrong: [5], at: '2026-09-15T21:00:00+05:30', minutes: 18 },
  { title: 'Data Structures & Algorithms Basics', wrong: [4, 8], at: '2026-10-26T19:30:00+05:30', minutes: 24 },
];

// ---------------------------------------------------------------------------
// Placement drives (shared, upserted by company + role)
// ---------------------------------------------------------------------------
const DRIVES = [
  {
    key: 'finvista',
    companyName: 'Finvista Labs',
    roleTitle: 'Full Stack Developer',
    description:
      'Build customer-facing fintech products end to end: React front ends, Node.js services and MongoDB data stores. You will work in a small product squad with direct ownership of features from design to production.',
    location: 'Pune', workMode: 'On-site', package: '₹14 LPA',
    applicationStart: '2026-10-15', applicationDeadline: '2026-11-25', driveDate: '2026-12-02',
    minimumCGPA: 7.0, maximumBacklogs: 0,
    skills: [['React', 4, false], ['Node.js', 4, false], ['MongoDB', 3, false], ['TypeScript', 3, false], ['Docker', 2, true]] as [string, number, boolean][],
  },
  {
    key: 'datapeak',
    companyName: 'DataPeak Analytics',
    roleTitle: 'Associate Data Engineer',
    description:
      'Design and maintain data pipelines that power analytics dashboards for retail clients. Work with Python, SQL warehouses and introductory machine-learning workflows.',
    location: 'Hyderabad', workMode: 'Hybrid', package: '₹10 LPA',
    applicationStart: '2026-10-18', applicationDeadline: '2026-11-28', driveDate: '2026-12-05',
    minimumCGPA: 7.5, maximumBacklogs: 0,
    skills: [['Python', 3, false], ['SQL', 3, false], ['Machine Learning', 2, true]] as [string, number, boolean][],
  },
  {
    key: 'cloudnest',
    companyName: 'CloudNest Systems',
    roleTitle: 'Cloud & DevOps Engineer Trainee',
    description:
      'Join the platform team running Kubernetes clusters on AWS. You will automate deployments, manage infrastructure as code and keep production services reliable.',
    location: 'Bengaluru', workMode: 'Hybrid', package: '₹9.5 LPA',
    applicationStart: '2026-10-20', applicationDeadline: '2026-11-30', driveDate: '2026-12-08',
    minimumCGPA: 6.5, maximumBacklogs: 1,
    skills: [['AWS', 4, false], ['Docker', 3, false], ['Linux', 3, false], ['Kubernetes', 2, false]] as [string, number, boolean][],
  },
  {
    key: 'nexora',
    companyName: 'Nexora Technologies',
    roleTitle: 'Software Development Engineer',
    description:
      'Work on large-scale backend systems in Java and Spring Boot. Strong problem solving with data structures and algorithms is essential; you will design services handling millions of requests per day.',
    location: 'Bengaluru', workMode: 'Hybrid', package: '₹16 LPA',
    applicationStart: '2026-10-25', applicationDeadline: '2026-12-05', driveDate: '2026-12-12',
    minimumCGPA: 7.5, maximumBacklogs: 0,
    skills: [['Java', 4, false], ['Data Structures', 3, false], ['Algorithms', 3, false], ['SQL', 3, false], ['Spring Boot', 2, true]] as [string, number, boolean][],
  },
];

// ---------------------------------------------------------------------------
// Past mock interviews (evaluated by the demo faculty)
// ---------------------------------------------------------------------------
const PAST_INTERVIEWS = [
  {
    type: 'Technical',
    at: '2026-10-10T16:00:00+05:30',
    rubric: { technicalKnowledge: 8, problemSolving: 8, communication: 9, projectDepth: 9 },
    notes: 'Covered REST API design, React state management and a medium array problem.',
    feedback:
      'Strong fundamentals and very clear communication. Explained the PlaceCampus architecture confidently. Work on optimising the brute-force approach before coding, and practise more graph problems.',
  },
  {
    type: 'System Design',
    at: '2026-10-24T17:30:00+05:30',
    rubric: { technicalKnowledge: 8, problemSolving: 7, communication: 8, projectDepth: 8 },
    notes: 'Designed a URL shortener: API, data model, caching and scaling discussion.',
    feedback:
      'Good structure: clarified requirements, sketched APIs and the data model first. Next step: go deeper on caching strategy, sharding keys and failure handling.',
  },
];

async function run() {
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_DEMO_SEED !== 'true') {
    console.error('Refusing to seed in production without ENABLE_DEMO_SEED=true.');
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const model = (name: string) => app.get<Model<any>>(getModelToken(name));
  const M = {
    user: model(User.name),
    profile: model(StudentProfile.name),
    evidence: model(Evidence.name),
    record: model(VerificationRecord.name),
    skill: model(Skill.name),
    claim: model(SkillClaim.name),
    skillProfile: model(StudentSkillProfile.name),
    assessment: model(Assessment.name),
    attempt: model(AssessmentAttempt.name),
    interview: model(MockInterview.name),
    slot: model(InterviewSlot.name),
    drive: model(PlacementDrive.name),
    application: model(PlacementApplication.name),
    plan: model(PreparationPlan.name),
    snapshot: model(ReadinessSnapshot.name),
    notification: model(Notification.name),
  };
  const students = app.get(StudentsService);
  const storage = app.get(StorageService);
  const extractor = app.get(DocumentExtractorService);
  const engine = app.get(VerificationEngineService);
  const faculty = app.get(FacultyService);
  const readiness = app.get(ReadinessService);
  const assessments = app.get(AssessmentsService);
  const drives = app.get(DrivesService);
  const applications = app.get(ApplicationsService);
  const preparation = app.get(PreparationService);
  const interviews = app.get(InterviewsService);
  const events = app.get(EventEmitter2);

  const facultyUser = await M.user.findOne({ email: FACULTY_EMAIL });
  const officerUser = await M.user.findOne({ email: OFFICER_EMAIL });
  if (!facultyUser || !officerUser) {
    throw new Error('Demo faculty / placement officer missing. Run `pnpm seed:demo` first.');
  }
  const facultyId = facultyUser._id.toString();
  const officerId = officerUser._id.toString();

  // -------------------------------------------------------------------------
  // 0. Reset: remove any previous copy of this student.
  // -------------------------------------------------------------------------
  const existing = await M.user.findOne({ email: STUDENT.email });
  if (existing) {
    const uid = existing._id.toString();
    const ids = [uid, new Types.ObjectId(uid)];
    console.log(`Removing previous data for ${STUDENT.email}...`);
    const oldEvidence = await M.evidence.find({ studentId: uid }).lean();
    for (const e of oldEvidence as any[]) {
      if (e.document?.key) await storage.deleteFile(e.document.key).catch(() => undefined);
    }
    const oldInterviews = await M.interview.find({ studentId: { $in: ids } }).lean();
    const interviewIds = (oldInterviews as any[]).map((i) => i._id.toString());
    await Promise.all([
      M.evidence.deleteMany({ studentId: uid }),
      M.record.deleteMany({ studentId: uid }),
      M.claim.deleteMany({ studentId: { $in: ids } }),
      M.skillProfile.deleteMany({ studentId: { $in: ids } }),
      M.attempt.deleteMany({ studentId: { $in: ids } }),
      M.interview.deleteMany({ studentId: { $in: ids } }),
      M.slot.deleteMany({ $or: [{ bookedBy: { $in: ids } }, { interviewId: { $in: interviewIds } }] }),
      M.application.deleteMany({ studentId: uid }),
      M.plan.deleteMany({ studentId: uid }),
      M.snapshot.deleteMany({ studentId: uid }),
      M.notification.deleteMany({ $or: [{ recipientId: uid }, { entityId: { $in: interviewIds } }] }),
      M.profile.deleteMany({ userId: uid }),
      M.user.deleteOne({ _id: existing._id }),
      app.get<Model<any>>(getModelToken('RefreshSession')).deleteMany({ userId: { $in: ids } }).catch(() => undefined),
    ]);
  }

  // -------------------------------------------------------------------------
  // 1. Account + profile
  // -------------------------------------------------------------------------
  const password = 'Abhishek@123';
  const user = await M.user.create({
    email: STUDENT.email,
    fullName: STUDENT.fullName,
    passwordHash: await bcrypt.hash(password, await bcrypt.genSalt()),
    role: UserRole.STUDENT,
    isActive: true,
  });
  const userId = user._id.toString();
  const idsOf = [userId, new Types.ObjectId(userId)];

  await students.getProfileByUserId(userId);
  await M.profile.updateOne(
    { userId },
    {
      $set: {
        phone: '+91 98480 21345',
        bio: 'Final-year B.Tech CSE student who loves building full-stack products. Built PlaceCampus (Next.js, NestJS, MongoDB), interned at Brightwave on Java/Spring Boot services and finished 1st runner-up at HackNova 2026. Looking for full-stack or backend roles.',
        university: 'PlaceCampus Institute of Technology',
        department: 'CSE',
        program: 'B.Tech',
        batch: '2023-2027',
        graduationYear: 2027,
        cgpa: 8.74,
        backlogs: 0,
        githubUrl: 'https://github.com/PANJA-ABHISHEK',
        portfolioUrl: 'https://github.com/PANJA-ABHISHEK/PlaceCampus',
      },
    },
  );
  await stamp(M.user, { _id: user._id }, '2025-08-01T09:00:00+05:30');
  await stamp(M.profile, { userId }, '2025-08-01T09:05:00+05:30', '2026-10-30T18:00:00+05:30');
  console.log(`Created ${STUDENT.fullName} <${STUDENT.email}>`);

  // Skill ids by canonical name, for drives, assessments and levels.
  const skills = new Map<string, any>();
  for (const s of await M.skill.find({ active: true }).lean()) skills.set((s as any).name, s);
  const skillId = (name: string) => {
    const s = skills.get(name);
    if (!s) throw new Error(`Skill "${name}" not found. Run the skills seed first.`);
    return s._id.toString();
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  /** Wait for async event handlers, then move everything they created to `when`. */
  async function settle(
    stepStart: Date,
    when: string,
    opts: { recompute?: boolean; claimsFor?: { evidenceId: any; expected: number } } = {},
  ) {
    // The skills listener saves one claim at a time; wait until it is done.
    if (opts.claimsFor) {
      for (let i = 0; i < 60; i++) {
        const n = await M.claim.countDocuments({ evidenceId: opts.claimsFor.evidenceId });
        if (n >= opts.claimsFor.expected) break;
        await sleep(250);
      }
    }
    await sleep(1500);
    if (opts.recompute) {
      await applyLevels();
      // Event-driven snapshots were computed before levels were applied.
      await M.snapshot.deleteMany({ studentId: userId, createdAt: { $gte: stepStart } });
      await readiness.calculateAndSaveReadiness(userId);
    }
    const at = d(when);
    await M.snapshot.collection.updateMany(
      { studentId: userId, createdAt: { $gte: stepStart } },
      { $set: { calculatedAt: at.toISOString(), createdAt: at, updatedAt: at } },
    );
    await M.notification.collection.updateMany(
      { recipientId: { $in: [userId, facultyId] }, createdAt: { $gte: stepStart } },
      { $set: { createdAt: at, updatedAt: at } },
    );
    await M.claim.collection.updateMany(
      { studentId: { $in: idsOf }, createdAt: { $gte: stepStart } },
      { $set: { verifiedAt: at.toISOString(), createdAt: at, updatedAt: at } },
    );
  }

  /** Set each verified skill's level from the evidence that backs it. */
  async function applyLevels() {
    const profile: any = await M.skillProfile.findOne({ studentId: { $in: idsOf } }).lean();
    if (!profile) return;
    for (const entry of profile.skills) {
      const count = entry.sourceEvidenceIds.length;
      const cap = LEVEL_CAP[entry.canonicalName] ?? 3;
      entry.level = Math.min(cap, count >= 2 ? cap : 3, 5);
    }
    await M.skillProfile.collection.updateOne({ _id: profile._id }, { $set: { skills: profile.skills } });
    for (const entry of profile.skills) {
      await M.claim.updateMany(
        { studentId: { $in: idsOf }, canonicalSkillId: entry.skillId },
        { $set: { level: entry.level } },
      );
    }
  }

  /** Upload a document and run it through extraction + the rules engine. */
  async function submitEvidence(e: EvidenceSeed) {
    const buffer = await fs.readFile(resolve(ASSET_DIR, e.file));
    const evidence = await M.evidence.create({
      studentId: userId,
      title: e.title,
      description: e.description,
      type: e.type,
      issuer: e.issuer,
      issuedDate: e.issuedDate,
      externalUrl: e.externalUrl,
      status: EvidenceStatus.PROCESSING,
    });
    const meta = await storage.saveFile(`evidence/${userId}`, {
      originalname: e.file,
      mimetype: 'application/pdf',
      size: buffer.length,
      buffer,
    });
    evidence.document = meta as any;

    const absolutePath = await storage.getFilePath(meta.key);
    const extraction = await extractor.extractText(absolutePath, 'application/pdf');
    const aiResult = {
      documentType: DOCUMENT_TYPE[e.type] ?? 'Document',
      issuer: e.issuer,
      claimedSkills: e.claimedSkills,
      skillRelevant: e.claimedSkills.length > 0,
      possibleDuplicate: false,
      readable: extraction.hasText,
      decision: 'VERIFIED' as const,
      confidence: e.confidence,
      reasons: e.aiReasons,
      modelVersion: AI_MODEL,
    };
    const outcome = engine.evaluate(
      { evidenceId: evidence.id, title: e.title, type: e.type as any },
      extraction,
      aiResult,
      null,
    );
    const record = await M.record.create({
      evidenceId: evidence.id,
      studentId: userId,
      attemptNumber: 1,
      extractionMethod: extraction.method,
      extractedTextMetadata: { wordCount: extraction.wordCount, hasText: extraction.hasText },
      aiProvider: process.env.AI_PROVIDER || 'openai',
      modelVersion: AI_MODEL,
      aiResult,
      ruleResults: outcome.ruleResults,
      finalDecision: outcome.finalDecision,
      reasons: outcome.reasons,
      processingDurationMs: 2800 + Math.round(Math.random() * 2400),
    });
    evidence.status = outcome.finalDecision;
    evidence.rejectionReason = outcome.reasons.join('; ');
    await evidence.save();
    return { evidence, record };
  }

  // -------------------------------------------------------------------------
  // 2. Shared catalogue: assessments and drives
  // -------------------------------------------------------------------------
  const assessmentIds = new Map<string, string>();
  for (const a of ASSESSMENTS) {
    const doc = {
      title: a.title,
      description: a.description,
      type: 'MCQ',
      targetSkillId: skillId(a.skill),
      durationMinutes: a.duration,
      passingScore: 60,
      difficulty: a.difficulty,
      active: true,
      questions: a.questions.map(([questionText, options, answer, explanation], i) => ({
        id: `${a.skill.toLowerCase().replace(/[^a-z]/g, '')}-q${i + 1}`,
        questionText,
        type: 'MCQ',
        options,
        correctAnswer: options[answer],
        difficulty: a.difficulty,
        skillId: skillId(a.skill),
        explanation,
        active: true,
      })),
    };
    const saved = await M.assessment.findOneAndUpdate({ title: a.title }, { $set: doc }, { upsert: true, new: true });
    assessmentIds.set(a.title, saved._id.toString());
  }
  await M.assessment.collection.updateMany(
    { title: { $in: ASSESSMENTS.map((a) => a.title) } },
    { $set: { createdAt: d('2026-01-05T10:00:00+05:30') } },
  );

  const driveIds = new Map<string, string>();
  for (const dr of DRIVES) {
    const payload: any = {
      companyName: dr.companyName,
      roleTitle: dr.roleTitle,
      description: dr.description,
      location: dr.location,
      workMode: dr.workMode,
      package: dr.package,
      applicationStart: dr.applicationStart,
      applicationDeadline: dr.applicationDeadline,
      driveDate: dr.driveDate,
      requirements: {
        minimumCGPA: dr.minimumCGPA,
        maximumBacklogs: dr.maximumBacklogs,
        graduationYear: 2027,
        allowedDepartments: ['CSE', 'IT'],
        skills: dr.skills.map(([name, minimumLevel, isOptional]) => ({
          skillId: skillId(name),
          skillName: name,
          minimumLevel,
          isOptional,
        })),
      },
    };
    let drive = await M.drive.findOne({ companyName: dr.companyName, roleTitle: dr.roleTitle });
    if (drive) {
      drive.set(payload);
      drive.status = 'PUBLISHED';
      await drive.save();
    } else {
      drive = await drives.create(payload, officerId);
      drive = await drives.publish(drive.id);
    }
    driveIds.set(dr.key, drive.id);
    await M.drive.collection.updateOne(
      { _id: drive._id },
      { $set: { createdAt: d(`${dr.applicationStart}T10:00:00+05:30`) } },
    );
  }
  console.log(`Catalogue ready: ${ASSESSMENTS.length} assessments, ${DRIVES.length} published drives`);

  // -------------------------------------------------------------------------
  // 3. Timeline: evidence, assessments and interviews in date order
  // -------------------------------------------------------------------------
  type Step = { at: string; run: () => Promise<void> };
  const steps: Step[] = [];

  for (const e of EVIDENCE) {
    const uploadedAt = `${e.issuedDate}T18:30:00+05:30`;
    steps.push({
      at: e.reviewedOn ?? uploadedAt,
      run: async () => {
        const start = new Date();
        const { evidence, record } = await submitEvidence(e);
        await stampDoc(M.evidence, evidence._id, uploadedAt);
        await stampDoc(M.record, record._id, uploadedAt);
        if (e.reviewedOn) {
          await faculty.makeDecision(evidence.id, facultyId, {
            action: ReviewAction.APPROVE,
            reason: e.facultyNote,
          });
          await M.evidence.collection.updateOne(
            { _id: evidence._id },
            { $set: { verifiedAt: d(e.reviewedOn).toISOString(), updatedAt: d(e.reviewedOn) }, $unset: { rejectionReason: '' } },
          );
          await M.record.collection.updateOne(
            { _id: record._id },
            { $set: { reviewedAt: d(e.reviewedOn).toISOString(), updatedAt: d(e.reviewedOn) } },
          );
          await settle(start, e.reviewedOn, {
            recompute: true,
            claimsFor: { evidenceId: evidence._id, expected: e.claimedSkills.length },
          });
        }
        console.log(`  evidence: ${e.title} -> ${e.reviewedOn ? 'VERIFIED' : 'NEEDS_REVIEW'}`);
      },
    });
  }

  for (const t of ATTEMPTS) {
    steps.push({
      at: t.at,
      run: async () => {
        const start = new Date();
        const assessmentId = assessmentIds.get(t.title)!;
        const assessment = await M.assessment.findById(assessmentId).lean();
        const answers: Record<string, string> = {};
        (assessment as any).questions.forEach((q: any, i: number) => {
          answers[q.id] = t.wrong.includes(i) ? q.options.find((o: string) => o !== q.correctAnswer) : q.correctAnswer;
        });
        const attempt = await assessments.startAssessment(assessmentId, userId);
        const result = await assessments.submitAssessment(attempt.id, userId, { answers });
        const submitted = d(t.at);
        const started = new Date(submitted.getTime() - t.minutes * 60_000 - 23_000);
        await M.attempt.collection.updateOne(
          { _id: result._id },
          {
            $set: {
              startedAt: started.toISOString(),
              submittedAt: submitted.toISOString(),
              durationSeconds: Math.round((submitted.getTime() - started.getTime()) / 1000),
              createdAt: started,
              updatedAt: submitted,
            },
          },
        );
        await settle(start, t.at, { recompute: true });
        console.log(`  assessment: ${t.title} -> ${result.percentage}%`);
      },
    });
  }

  for (const iv of PAST_INTERVIEWS) {
    steps.push({
      at: iv.at,
      run: async () => {
        const start = new Date();
        const scheduled = d(iv.at);
        const completed = new Date(scheduled.getTime() + 47 * 60_000);
        const interview = await M.interview.create({
          studentId: userId,
          interviewerId: facultyId,
          type: iv.type,
          scheduledAt: scheduled.toISOString(),
          durationMinutes: 45,
          meetingUrl: 'https://meet.jit.si/PlaceCampus-Mock-Interview',
          startedAt: new Date(scheduled.getTime() + 2 * 60_000).toISOString(),
          completedAt: completed.toISOString(),
          status: 'COMPLETED',
          notes: iv.notes,
          rubricScores: iv.rubric,
          feedback: iv.feedback,
        });
        const slot = await M.slot.create({
          interviewerId: facultyId,
          type: iv.type,
          startsAt: scheduled,
          durationMinutes: 45,
          meetingUrl: 'https://meet.jit.si/PlaceCampus-Mock-Interview',
          status: 'BOOKED',
          bookedBy: userId,
          interviewId: interview._id,
        });
        interview.slotId = slot._id;
        await interview.save();
        const booked = new Date(scheduled.getTime() - 3 * 86_400_000);
        await M.interview.collection.updateOne({ _id: interview._id }, { $set: { createdAt: booked, updatedAt: completed } });
        await M.slot.collection.updateOne({ _id: slot._id }, { $set: { createdAt: new Date(booked.getTime() - 86_400_000), updatedAt: booked } });
        events.emit('interview.evaluated', { interview });
        await settle(start, completed.toISOString(), { recompute: true });
        console.log(`  mock interview: ${iv.type} -> COMPLETED`);
      },
    });
  }

  steps.sort((a, b) => d(a.at).getTime() - d(b.at).getTime());
  for (const step of steps) await step.run();

  // -------------------------------------------------------------------------
  // 4. Applications, preparation plan and an upcoming interview
  // -------------------------------------------------------------------------
  const finvista = await applications.applyToDrive(driveIds.get('finvista')!, userId);
  await stampApplication(finvista, '2026-10-29T20:15:00+05:30');
  let s = new Date();
  await applications.reviewApplication(finvista.id, { status: 'UNDER_REVIEW' } as any, officerId);
  await settle(s, '2026-10-31T11:00:00+05:30');
  s = new Date();
  await applications.reviewApplication(
    finvista.id,
    { status: 'SHORTLISTED', reviewerComment: 'Strong full-stack evidence and readiness. Shortlisted for the technical round on 2 Dec.' } as any,
    officerId,
  );
  await settle(s, '2026-11-02T15:30:00+05:30');
  await M.application.collection.updateOne({ _id: finvista._id }, { $set: { reviewedAt: d('2026-11-02T15:30:00+05:30'), updatedAt: d('2026-11-02T15:30:00+05:30') } });
  console.log('  application: Finvista Labs -> SHORTLISTED');

  const datapeak = await applications.applyToDrive(driveIds.get('datapeak')!, userId);
  await stampApplication(datapeak, '2026-10-30T21:40:00+05:30');
  s = new Date();
  await applications.reviewApplication(datapeak.id, { status: 'UNDER_REVIEW' } as any, officerId);
  await settle(s, '2026-11-01T10:30:00+05:30');
  await M.application.collection.updateOne({ _id: datapeak._id }, { $set: { reviewedAt: d('2026-11-01T10:30:00+05:30'), updatedAt: d('2026-11-01T10:30:00+05:30') } });
  console.log('  application: DataPeak Analytics -> UNDER_REVIEW');

  s = new Date();
  const plan = await preparation.createForDrive(driveIds.get('cloudnest')!, userId);
  const planItems = (plan as any).items as any[];
  if (planItems[0]) await preparation.updateItemStatus(plan.id, planItems[0].itemId, userId, 'IN_PROGRESS' as any);
  if (planItems[1]) await preparation.updateItemStatus(plan.id, planItems[1].itemId, userId, 'COMPLETED' as any);
  await settle(s, '2026-11-01T19:00:00+05:30');
  await M.plan.collection.updateOne({ _id: plan._id }, { $set: { createdAt: d('2026-11-01T19:00:00+05:30') } });
  console.log(`  preparation plan: CloudNest Systems (${planItems.length} skill gaps)`);

  // Upcoming technical round with the demo faculty, booked through the real flow.
  const nextSlotStart = nextWeekdayAt(3, 10, 30);
  const slot = await interviews.createSlot(facultyId, {
    type: 'Technical',
    startsAt: nextSlotStart.toISOString(),
    durationMinutes: 45,
    meetingUrl: 'https://meet.jit.si/PlaceCampus-Mock-Interview',
    notes: 'Final technical mock before the Finvista Labs drive: DSA + project deep-dive.',
  } as any);
  s = new Date();
  await interviews.bookSlot((slot as any).id ?? (slot as any)._id.toString(), userId);
  await sleep(1200);
  console.log(`  mock interview: Technical booked for ${nextSlotStart.toISOString()}`);

  // Older notifications have been read; keep the last few days unread.
  await M.notification.collection.updateMany(
    { recipientId: userId, createdAt: { $lt: d('2026-10-30T00:00:00+05:30') } },
    [{ $set: { readAt: { $add: ['$createdAt', 3_600_000] } } }],
  );

  const latest = await readiness.getLatestSnapshot(userId);
  const skillProfile = await M.skillProfile.findOne({ studentId: { $in: idsOf } }).lean();
  console.log('====================================');
  console.log(`Student:   ${STUDENT.fullName}`);
  console.log(`Login:     ${STUDENT.email}`);
  console.log(`Password:  ${password}`);
  console.log(`Readiness: ${(latest as any).overallScore} (${(latest as any).status})`);
  console.log(`Verified skills: ${(skillProfile as any)?.skills?.length ?? 0}`);
  console.log('Pending for faculty review: "Data Structures & Algorithms in C++"');
  console.log('====================================');

  await app.close().catch(() => undefined);

  // ---- local helpers that need models ----
  async function stampApplication(application: any, when: string) {
    await M.application.collection.updateOne(
      { _id: application._id },
      { $set: { appliedAt: d(when), createdAt: d(when), updatedAt: d(when) } },
    );
    await M.notification.collection.updateMany(
      { recipientId: userId, entityId: application.id, type: 'APPLICATION_SUBMITTED' },
      { $set: { createdAt: d(when), updatedAt: d(when) } },
    );
  }
}

/** Set createdAt/updatedAt on matching documents, bypassing Mongoose timestamps. */
async function stamp(model: Model<any>, filter: any, created: string, updated = created) {
  await model.collection.updateMany(filter, { $set: { createdAt: d(created), updatedAt: d(updated) } });
}

async function stampDoc(model: Model<any>, id: any, when: string) {
  await stamp(model, { _id: id }, when);
}

/** Next date `daysAhead` days from now at the given IST time (as a UTC Date). */
function nextWeekdayAt(daysAhead: number, hour: number, minute: number) {
  const target = new Date(Date.now() + daysAhead * 86_400_000);
  const ist = new Date(target.getTime() + 330 * 60_000);
  ist.setUTCHours(hour, minute, 0, 0);
  if (ist.getUTCDay() === 0) ist.setUTCDate(ist.getUTCDate() + 1); // skip Sunday
  return new Date(ist.getTime() - 330 * 60_000);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Showcase seed failed:', err);
    process.exit(1);
  });
