import * as React from "react";
import {
  SiAngular,
  SiAngularHex,
  SiC,
  SiCHex,
  SiCplusplus,
  SiCplusplusHex,
  SiCss,
  SiCssHex,
  SiDjango,
  SiDjangoHex,
  SiDocker,
  SiDockerHex,
  SiExpress,
  SiExpressHex,
  SiFastapi,
  SiFastapiHex,
  SiFirebase,
  SiFirebaseHex,
  SiFlask,
  SiFlaskHex,
  SiGit,
  SiGitHex,
  SiGithub,
  SiGithubHex,
  SiGo,
  SiGoHex,
  SiGraphql,
  SiGraphqlHex,
  SiHtml5,
  SiHtml5Hex,
  SiJavascript,
  SiJavascriptHex,
  SiJupyter,
  SiJupyterHex,
  SiKotlin,
  SiKotlinHex,
  SiKubernetes,
  SiKubernetesHex,
  SiLinux,
  SiLinuxHex,
  SiMariadb,
  SiMariadbHex,
  SiMongodb,
  SiMongodbHex,
  SiMysql,
  SiMysqlHex,
  SiNextdotjs,
  SiNextdotjsHex,
  SiNodedotjs,
  SiNodedotjsHex,
  SiNumpy,
  SiNumpyHex,
  SiPandas,
  SiPandasHex,
  SiPhp,
  SiPhpHex,
  SiPostgresql,
  SiPostgresqlHex,
  SiPython,
  SiPythonHex,
  SiPytorch,
  SiPytorchHex,
  SiReact,
  SiReactHex,
  SiRedis,
  SiRedisHex,
  SiRust,
  SiRustHex,
  SiScikitlearn,
  SiScikitlearnHex,
  SiSpringboot,
  SiSpringbootHex,
  SiSqlite,
  SiSqliteHex,
  SiTailwindcss,
  SiTailwindcssHex,
  SiTensorflow,
  SiTensorflowHex,
  SiTypescript,
  SiTypescriptHex,
  SiVuedotjs,
  SiVuedotjsHex,
} from "@icons-pack/react-simple-icons";
import {
  Binary,
  BrainCircuit,
  Cloud,
  Code2,
  Coffee,
  Database,
  Boxes,
  MessagesSquare,
  Puzzle,
  Users,
  Webhook,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------------------
 * Categories
 * There are no skill clusters in the database yet, so categories are derived
 * here from the canonical skill name. Exactly four are shown as cards.
 * ------------------------------------------------------------------------- */

export type SkillCategory =
  | "PROGRAMMING"
  | "DATABASE"
  | "WEB_DEVELOPMENT"
  | "AI_ML"
  | "OTHER";

export const MAIN_CATEGORIES = [
  "PROGRAMMING",
  "DATABASE",
  "WEB_DEVELOPMENT",
  "AI_ML",
] as const satisfies readonly SkillCategory[];

export const CATEGORY_META: Record<
  SkillCategory,
  { label: string; icon: LucideIcon; badge: string; iconClass: string }
> = {
  PROGRAMMING: {
    label: "Programming",
    icon: Code2,
    badge: "bg-orange-50 text-orange-700 ring-orange-200",
    iconClass: "text-[hsl(var(--primary))]",
  },
  DATABASE: {
    label: "Database",
    icon: Database,
    badge: "bg-violet-50 text-violet-700 ring-violet-200",
    iconClass: "text-violet-600",
  },
  WEB_DEVELOPMENT: {
    label: "Web Development",
    icon: Webhook,
    badge: "bg-sky-50 text-sky-700 ring-sky-200",
    iconClass: "text-sky-600",
  },
  AI_ML: {
    label: "AI & Machine Learning",
    icon: BrainCircuit,
    badge: "bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-200",
    iconClass: "text-fuchsia-600",
  },
  OTHER: {
    label: "Other",
    icon: Boxes,
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    iconClass: "text-slate-600",
  },
};

/* ---------------------------------------------------------------------------
 * Icon registry
 * ------------------------------------------------------------------------- */

type IconComponent = React.ComponentType<{
  size?: number | string;
  color?: string;
  className?: string;
}>;

export interface SkillIconDef {
  /** Stable key, safe to persist. */
  key: string;
  label: string;
  icon: IconComponent;
  color: string;
  category: SkillCategory;
  /** False for concepts drawn with a Lucide icon instead of a brand logo. */
  brand: boolean;
  aliases?: string[];
}

const NEUTRAL = "#334155";

export const SKILL_ICONS: SkillIconDef[] = [
  // Programming
  { key: "python", label: "Python", icon: SiPython, color: SiPythonHex, category: "PROGRAMMING", brand: true, aliases: ["py", "python3"] },
  // Simple Icons has no Java (Oracle) logo; a coffee cup in Java orange reads as Java.
  { key: "java", label: "Java", icon: Coffee, color: "#E76F00", category: "PROGRAMMING", brand: false, aliases: ["openjdk", "core java"] },
  { key: "cpp", label: "C++", icon: SiCplusplus, color: SiCplusplusHex, category: "PROGRAMMING", brand: true, aliases: ["cplusplus", "cpp"] },
  { key: "c", label: "C", icon: SiC, color: SiCHex, category: "PROGRAMMING", brand: true, aliases: ["c language", "c programming"] },
  { key: "javascript", label: "JavaScript", icon: SiJavascript, color: SiJavascriptHex, category: "PROGRAMMING", brand: true, aliases: ["js", "ecmascript", "es6"] },
  { key: "typescript", label: "TypeScript", icon: SiTypescript, color: SiTypescriptHex, category: "PROGRAMMING", brand: true, aliases: ["ts"] },
  { key: "go", label: "Go", icon: SiGo, color: SiGoHex, category: "PROGRAMMING", brand: true, aliases: ["golang"] },
  { key: "rust", label: "Rust", icon: SiRust, color: SiRustHex, category: "PROGRAMMING", brand: true },
  { key: "kotlin", label: "Kotlin", icon: SiKotlin, color: SiKotlinHex, category: "PROGRAMMING", brand: true },
  { key: "php", label: "PHP", icon: SiPhp, color: SiPhpHex, category: "PROGRAMMING", brand: true },
  { key: "data-structures", label: "Data Structures", icon: Binary, color: NEUTRAL, category: "PROGRAMMING", brand: false, aliases: ["dsa", "data structures and algorithms", "data structure"] },
  { key: "algorithms", label: "Algorithms", icon: Workflow, color: NEUTRAL, category: "PROGRAMMING", brand: false, aliases: ["algorithm", "algo"] },
  { key: "problem-solving", label: "Problem Solving", icon: Puzzle, color: NEUTRAL, category: "PROGRAMMING", brand: false, aliases: ["competitive programming"] },

  // Database
  { key: "sql", label: "SQL", icon: Database, color: "#336791", category: "DATABASE", brand: false, aliases: ["structured query language"] },
  { key: "mysql", label: "MySQL", icon: SiMysql, color: SiMysqlHex, category: "DATABASE", brand: true },
  { key: "postgresql", label: "PostgreSQL", icon: SiPostgresql, color: SiPostgresqlHex, category: "DATABASE", brand: true, aliases: ["postgres", "psql"] },
  { key: "mongodb", label: "MongoDB", icon: SiMongodb, color: SiMongodbHex, category: "DATABASE", brand: true, aliases: ["mongo"] },
  { key: "redis", label: "Redis", icon: SiRedis, color: SiRedisHex, category: "DATABASE", brand: true },
  { key: "sqlite", label: "SQLite", icon: SiSqlite, color: SiSqliteHex, category: "DATABASE", brand: true },
  { key: "mariadb", label: "MariaDB", icon: SiMariadb, color: SiMariadbHex, category: "DATABASE", brand: true },
  { key: "firebase", label: "Firebase", icon: SiFirebase, color: SiFirebaseHex, category: "DATABASE", brand: true, aliases: ["firestore"] },

  // Web development
  { key: "react", label: "React", icon: SiReact, color: SiReactHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["reactjs", "react js"] },
  { key: "nextjs", label: "Next.js", icon: SiNextdotjs, color: SiNextdotjsHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["next", "nextjs"] },
  { key: "nodejs", label: "Node.js", icon: SiNodedotjs, color: SiNodedotjsHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["node", "nodejs"] },
  { key: "express", label: "Express", icon: SiExpress, color: SiExpressHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["expressjs", "express js"] },
  { key: "html", label: "HTML", icon: SiHtml5, color: SiHtml5Hex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["html5"] },
  { key: "css", label: "CSS", icon: SiCss, color: SiCssHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["css3"] },
  { key: "tailwindcss", label: "Tailwind CSS", icon: SiTailwindcss, color: SiTailwindcssHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["tailwind"] },
  { key: "angular", label: "Angular", icon: SiAngular, color: SiAngularHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["angularjs"] },
  { key: "vue", label: "Vue.js", icon: SiVuedotjs, color: SiVuedotjsHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["vue", "vuejs"] },
  { key: "graphql", label: "GraphQL", icon: SiGraphql, color: SiGraphqlHex, category: "WEB_DEVELOPMENT", brand: true },
  { key: "rest-api", label: "REST API", icon: Webhook, color: NEUTRAL, category: "WEB_DEVELOPMENT", brand: false, aliases: ["rest", "restful api", "rest apis", "api development"] },
  { key: "django", label: "Django", icon: SiDjango, color: SiDjangoHex, category: "WEB_DEVELOPMENT", brand: true },
  { key: "flask", label: "Flask", icon: SiFlask, color: SiFlaskHex, category: "WEB_DEVELOPMENT", brand: true },
  { key: "fastapi", label: "FastAPI", icon: SiFastapi, color: SiFastapiHex, category: "WEB_DEVELOPMENT", brand: true },
  { key: "spring-boot", label: "Spring Boot", icon: SiSpringboot, color: SiSpringbootHex, category: "WEB_DEVELOPMENT", brand: true, aliases: ["spring", "springboot"] },

  // AI & machine learning
  { key: "machine-learning", label: "Machine Learning", icon: BrainCircuit, color: "#A21CAF", category: "AI_ML", brand: false, aliases: ["ml", "deep learning", "ai", "artificial intelligence", "data science", "nlp"] },
  { key: "tensorflow", label: "TensorFlow", icon: SiTensorflow, color: SiTensorflowHex, category: "AI_ML", brand: true },
  { key: "pytorch", label: "PyTorch", icon: SiPytorch, color: SiPytorchHex, category: "AI_ML", brand: true, aliases: ["torch"] },
  { key: "scikit-learn", label: "scikit-learn", icon: SiScikitlearn, color: SiScikitlearnHex, category: "AI_ML", brand: true, aliases: ["sklearn", "scikit learn"] },
  { key: "pandas", label: "Pandas", icon: SiPandas, color: SiPandasHex, category: "AI_ML", brand: true },
  { key: "numpy", label: "NumPy", icon: SiNumpy, color: SiNumpyHex, category: "AI_ML", brand: true },
  { key: "jupyter", label: "Jupyter", icon: SiJupyter, color: SiJupyterHex, category: "AI_ML", brand: true, aliases: ["jupyter notebook"] },

  // Other (tools, cloud, soft skills) — shown in the table, not as a card
  { key: "docker", label: "Docker", icon: SiDocker, color: SiDockerHex, category: "OTHER", brand: true },
  { key: "kubernetes", label: "Kubernetes", icon: SiKubernetes, color: SiKubernetesHex, category: "OTHER", brand: true, aliases: ["k8s"] },
  { key: "git", label: "Git", icon: SiGit, color: SiGitHex, category: "OTHER", brand: true },
  { key: "github", label: "GitHub", icon: SiGithub, color: SiGithubHex, category: "OTHER", brand: true },
  { key: "linux", label: "Linux", icon: SiLinux, color: SiLinuxHex, category: "OTHER", brand: true },
  // Simple Icons no longer ships the AWS logo, so use a neutral cloud in AWS orange.
  { key: "aws", label: "AWS", icon: Cloud, color: "#FF9900", category: "OTHER", brand: false, aliases: ["amazon web services", "amazon aws"] },
  { key: "system-design", label: "System Design", icon: Boxes, color: NEUTRAL, category: "OTHER", brand: false, aliases: ["hld", "lld", "software design"] },
  { key: "communication", label: "Communication", icon: MessagesSquare, color: NEUTRAL, category: "OTHER", brand: false, aliases: ["communication skills"] },
  { key: "teamwork", label: "Teamwork", icon: Users, color: NEUTRAL, category: "OTHER", brand: false, aliases: ["collaboration", "leadership"] },
];

/** Lowercase and drop separators, so "React.js", "react js" and "ReactJS" match. */
export function normalizeSkillName(name: string) {
  return name.trim().toLowerCase().replace(/[\s._\-/]+/g, "");
}

const LOOKUP = new Map<string, SkillIconDef>();
for (const def of SKILL_ICONS) {
  for (const name of [def.key, def.label, ...(def.aliases ?? [])]) {
    LOOKUP.set(normalizeSkillName(name), def);
  }
}

const BY_KEY = new Map(SKILL_ICONS.map((def) => [def.key, def]));

/** Detect a skill's icon from its name. Returns null when nothing matches. */
export function detectSkillIcon(name: string): SkillIconDef | null {
  const normalized = normalizeSkillName(name);
  if (!normalized) return null;
  return (
    LOOKUP.get(normalized) ??
    // "Expressjs" → "express", "Reactjs" → "react"
    (normalized.endsWith("js") ? LOOKUP.get(normalized.slice(0, -2)) : undefined) ??
    null
  );
}

export function getSkillIconByKey(key: string | undefined | null) {
  return key ? (BY_KEY.get(key) ?? null) : null;
}

export function getSkillCategory(name: string): SkillCategory {
  return detectSkillIcon(name)?.category ?? "OTHER";
}

/** Brand logo (or Lucide fallback) in a soft tinted tile. */
export function SkillIcon({
  name,
  iconKey,
  size = "md",
  className,
}: {
  name: string;
  iconKey?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const def = getSkillIconByKey(iconKey) ?? detectSkillIcon(name);
  const Icon: IconComponent = def?.icon ?? Code2;
  const color = def?.color ?? NEUTRAL;
  const box = { sm: "h-8 w-8 rounded-lg", md: "h-10 w-10 rounded-xl", lg: "h-14 w-14 rounded-2xl" }[size];
  const glyph = { sm: 16, md: 20, lg: 28 }[size];

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center ring-1 ring-black/5",
        box,
        className,
      )}
      // 8-digit hex: brand colour at ~8% opacity for the tile background.
      style={{ backgroundColor: `${color}14` }}
    >
      <Icon size={glyph} color={color} />
    </span>
  );
}
