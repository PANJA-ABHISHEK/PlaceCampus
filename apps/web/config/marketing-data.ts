import { Shield, BarChart3, GraduationCap, CheckCircle } from "lucide-react";

export const navigationLinks = {
  main: [
    { title: "Platform", href: "#platform" },
    { title: "How It Works", href: "#how-it-works" },
    { title: "For Students", href: "#students" },
    { title: "For Universities", href: "#universities" },
    { title: "For Recruiters", href: "#recruiters" },
  ],
  footer: {
    platform: [
      { title: "Students", href: "/students" },
      { title: "Faculty", href: "/faculty" },
      { title: "Placement Teams", href: "/placements" },
      { title: "Recruiters", href: "/recruiters" },
    ],
    company: [
      { title: "About", href: "/about" },
      { title: "How It Works", href: "/how-it-works" },
      { title: "Contact", href: "/contact" },
    ],
    support: [
      { title: "Help Center", href: "/help" },
      { title: "Privacy Policy", href: "/privacy" },
      { title: "Terms of Service", href: "/terms" },
    ],
  },
};

export const valueCards = [
  {
    icon: Shield,
    title: "Verified Skills",
    description:
      "Ensure student capabilities are validated through intelligent AI and faculty review.",
  },
  {
    icon: BarChart3,
    title: "Explainable Readiness",
    description:
      "Provide students with clear, actionable readiness scores across multiple dimensions.",
  },
  {
    icon: GraduationCap,
    title: "Intelligent Matching",
    description:
      "Connect graduates with opportunities that perfectly align with their verified skills.",
  },
  {
    icon: CheckCircle,
    title: "Targeted Preparation",
    description:
      "Identify skill gaps early and generate personalized preparation pathways.",
  },
];

export const workflowSteps = [
  {
    id: "01",
    title: "Build Profile",
    description:
      "Students create their comprehensive academic and skill profile.",
  },
  {
    id: "02",
    title: "Add Evidence",
    description: "Upload certificates, projects, and achievements securely.",
  },
  {
    id: "03",
    title: "Verify Skills",
    description: "AI analyzes evidence, faculty provides final verification.",
  },
  {
    id: "04",
    title: "Measure Readiness",
    description: "Dynamic readiness scores calculate across key dimensions.",
  },
  {
    id: "05",
    title: "Match Opportunities",
    description:
      "Intelligent matching connects students to eligible placement drives.",
  },
  {
    id: "06",
    title: "Improve Gaps",
    description:
      "Actionable feedback helps students improve targeted skill gaps.",
  },
];

export const companyMatches = [
  {
    name: "Amazon",
    role: "Software Engineer",
    match: 82,
    status: "Eligible",
    logo: "https://upload.wikimedia.org/wikipedia/commons/4/4a/Amazon_icon.svg",
  },
  {
    name: "TCS",
    role: "Graduate Engineer",
    match: 76,
    status: "Eligible",
    logo: "https://upload.wikimedia.org/wikipedia/commons/b/b1/Tata_Consultancy_Services_Logo.svg",
  },
  {
    name: "Infosys",
    role: "Systems Engineer",
    match: 69,
    status: "Needs Preparation",
    logo: "https://upload.wikimedia.org/wikipedia/commons/9/95/Infosys_logo.svg",
  },
  {
    name: "Accenture",
    role: "Associate Software Engineer",
    match: 88,
    status: "Eligible",
    logo: "https://upload.wikimedia.org/wikipedia/commons/c/cd/Accenture.svg",
  },
];

export const skillGaps = [
  { skill: "DSA", current: 2, required: 4, impact: "High" },
  { skill: "Node.js", current: 2, required: 3, impact: "Medium" },
  { skill: "Communication", current: 2, required: 3, impact: "Medium" },
];

export const preparationPlan = [
  { day: "Day 1", task: "Review core data structures", completed: true },
  {
    day: "Day 4",
    task: "Practice common array/string algorithms",
    completed: false,
  },
  {
    day: "Day 7",
    task: "Complete Node.js express fundamentals module",
    completed: false,
  },
  { day: "Day 10", task: "Mock technical interview", completed: false },
  { day: "Day 14", task: "Re-assessment", completed: false },
];

export const roles = [
  {
    name: "Student",
    description: "Build profile, track readiness, and apply for opportunities.",
  },
  {
    name: "Faculty",
    description: "Review evidence and verify student capabilities.",
  },
  {
    name: "Placement Officer",
    description: "Manage drives, track overall university readiness.",
  },
  {
    name: "Placement Head",
    description: "Oversee placement operations and analytics.",
  },
  {
    name: "Recruiter",
    description: "Discover verified talent and manage recruitment pipelines.",
  },
  {
    name: "Admin",
    description: "Configure platform settings and manage users.",
  },
];

export const verificationStages = [
  { id: "upload", label: "Upload", status: "completed" },
  { id: "ocr", label: "OCR", status: "completed" },
  { id: "ai", label: "AI Analysis", status: "active" },
  { id: "rules", label: "Rule Check", status: "pending" },
  { id: "decision", label: "Decision", status: "pending" },
];

export const readinessFactors = [
  { name: "Verified Skills", score: 85, weight: 30 },
  { name: "Assessments", score: 72, weight: 25 },
  { name: "Academics", score: 88, weight: 20 },
  { name: "Projects", score: 75, weight: 15 },
  { name: "Interviews", score: 65, weight: 10 },
];

export const rolesInfo = [
  {
    id: "student",
    name: "Student",
    description:
      "The center of the platform. Students build profiles, track readiness, and discover matching opportunities.",
    tasks: [
      "Track readiness scores",
      "Upload verification evidence",
      "Apply to matched drives",
      "Follow preparation plans",
    ],
    dashboardStats: ["78% Readiness", "3 Matches", "2 Skill Gaps"],
  },
  {
    id: "faculty",
    name: "Faculty",
    description:
      "The human-in-the-loop for verification. Faculty review uncertain evidence and conduct mock interviews.",
    tasks: [
      "Review flagged evidence",
      "Verify student projects",
      "Conduct mock interviews",
      "Provide feedback",
    ],
    dashboardStats: ["12 Pending Reviews", "4 Interviews Today"],
  },
  {
    id: "po",
    name: "Placement Officer",
    description:
      "The orchestrator. Placement officers manage drives, set eligibility, and track overall student readiness.",
    tasks: [
      "Create placement drives",
      "Set skill eligibility",
      "Manage shortlists",
      "Track drive status",
    ],
    dashboardStats: ["5 Active Drives", "120 Students Eligible"],
  },
  {
    id: "head",
    name: "Placement Head",
    description:
      "The strategist. Placement heads analyze institution-wide analytics and direct training efforts.",
    tasks: [
      "View institution analytics",
      "Analyze skill gaps",
      "Direct training initiatives",
      "Track placement outcomes",
    ],
    dashboardStats: ["74% Avg Readiness", "85% Placement Rate"],
  },
  {
    id: "recruiter",
    name: "Recruiter",
    description:
      "The demand side. Recruiters access verified talent pools perfectly matched to their role requirements.",
    tasks: [
      "View matched candidates",
      "Review verified skills",
      "Manage recruitment pipeline",
      "Provide feedback",
    ],
    dashboardStats: ["45 Candidates Matched", "12 Interviewed"],
  },
  {
    id: "admin",
    name: "Admin",
    description:
      "The configurator. Admins manage the platform structure, skills ontology, and user access.",
    tasks: [
      "Manage users & roles",
      "Configure skills ontology",
      "Monitor system access",
      "System settings",
    ],
    dashboardStats: ["1,240 Active Users", "System Healthy"],
  },
];

export const analyticsPreview = {
  institutionReadiness: 74,
  batches: [
    { year: 2027, score: 78 },
    { year: 2028, score: 71 },
    { year: 2029, score: 63 },
  ],
  demandSupply: [
    { skill: "DSA", demand: 4000, supply: 2400 },
    { skill: "React", demand: 2500, supply: 2100 },
    { skill: "Spring Boot", demand: 1800, supply: 700 },
    { skill: "SQL", demand: 3000, supply: 2800 },
  ],
};
