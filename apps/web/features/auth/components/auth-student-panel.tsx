import Image from 'next/image';
import { BriefcaseBusiness, GraduationCap, ShieldCheck, TrendingUp, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './auth-motion.module.css';

const delay = (seconds: number) => ({ '--float-delay': `${seconds}s` }) as React.CSSProperties;

/**
 * Badges are static (no idle drift) and positioned in the student's own box (percent of her height and
 * width), so at every size they sit beside her hair, sleeve and backpack and
 * never cover her face, laptop or hands. Each offset is clamped to the gap between
 * her and the panel edge (the panel is 50vw), so badges never leave the panel.
 */
const BADGES: {
  icon: LucideIcon;
  lines: [string, string];
  position: string;
  enter: number;
}[] = [
  { icon: ShieldCheck, lines: ['Verified', 'Skills'], position: 'top-[13%] right-[max(-32%,calc((100%_-_50vw)/2_+_12px))]', enter: 0.5 },
  { icon: TrendingUp, lines: ['Career', 'Growth'], position: 'top-[24%] left-[max(-30%,calc((100%_-_50vw)/2_+_12px))]', enter: 0.7 },
  { icon: GraduationCap, lines: ['Build Your', 'Readiness'], position: 'top-[48%] right-[max(-36%,calc((100%_-_50vw)/2_+_12px))]', enter: 0.9 },
  { icon: BriefcaseBusiness, lines: ['Placement', 'Opportunities'], position: 'top-[72%] right-[max(-34%,calc((100%_-_50vw)/2_+_12px))]', enter: 1.1 },
];

function FloatingBadge({ icon: Icon, lines, position, enter }: (typeof BADGES)[number]) {
  return (
    <div className={cn('absolute z-20', styles.badgeIn, position)} style={{ '--badge-delay': `${enter}s` } as React.CSSProperties}>
      <div>
        <div className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-white/85 py-2 pl-2 pr-4 shadow-[0_14px_32px_-14px_rgba(255,107,26,0.55),0_4px_12px_-6px_rgba(11,31,68,0.15)] ring-1 ring-white backdrop-blur-md transition-transform duration-300 ease-out hover:scale-[1.04] xl:gap-3 xl:py-2.5 xl:pl-2.5 xl:pr-5 2xl:pr-6">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FF6B1A]/12 text-[#FF6B1A] xl:h-10 xl:w-10 2xl:h-11 2xl:w-11">
            <Icon className="h-4 w-4 xl:h-5 xl:w-5 2xl:h-[22px] 2xl:w-[22px]" strokeWidth={2.2} />
          </span>
          <span className="text-[12px] font-bold leading-[1.2] text-[#0B1F44] xl:text-[14px] 2xl:text-[15px]">
            {lines.map((line) => (
              <span key={line} className="block whitespace-nowrap">{line}</span>
            ))}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Left half of the auth pages: the PlaceCampus student on a warm cream-peach backdrop. */
export function AuthStudentPanel() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Warm lighting. */}
      <div className="absolute inset-0 bg-[linear-gradient(160deg,#FFFCFA_0%,#FFF1E7_45%,#FFE3D0_100%)]" />
      <div className={cn('absolute left-1/2 top-1/2 h-[min(80dvh,46vw)] w-[min(80dvh,46vw)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,107,26,0.22)_0%,rgba(255,107,26,0.08)_45%,transparent_70%)]', styles.glowPulse)} />
      <div className="absolute left-1/2 top-1/2 h-[min(62dvh,36vw)] w-[min(62dvh,36vw)] -translate-x-1/2 -translate-y-[46%] rounded-full bg-gradient-to-b from-white/80 to-white/10 ring-1 ring-white" />
      {/* Dashed orbit linking the badges. */}
      <div className="absolute left-1/2 top-1/2 h-[min(74dvh,42vw)] w-[min(74dvh,42vw)] -translate-x-1/2 -translate-y-1/2 rounded-full border-[1.5px] border-dashed border-[#FF6B1A]/30">
        <span className="absolute left-[6%] top-[24%] h-2.5 w-2.5 rounded-full border-2 border-[#FF6B1A]/60 bg-white" />
        <span className="absolute bottom-[30%] right-[1%] h-2.5 w-2.5 rounded-full border-2 border-[#FF6B1A]/60 bg-white" />
      </div>

      {/* Subtle floating accents. */}
      <span className={cn('absolute bottom-[18%] left-[9%] h-12 w-12 rounded-full bg-[#FF6B1A]/12', styles.bubbleFloat)} style={delay(1.2)} />
      <span className={cn('absolute right-[10%] top-[8%] h-3 w-3 rounded-full bg-[#FF6B1A]/60', styles.bubbleFloat)} style={delay(0.6)} />
      <span className={cn('absolute bottom-[12%] right-[16%] h-3 w-3 rounded-full bg-[#0B1F44]/20', styles.bubbleFloat)} style={delay(2)} />
      <div className="absolute bottom-[8%] right-[6%] h-20 w-20 bg-[radial-gradient(circle,rgba(255,107,26,0.35)_1.2px,transparent_1.6px)] [background-size:12px_12px]" />
      <div className="absolute left-[5%] top-[5%] h-16 w-16 bg-[radial-gradient(circle,rgba(11,31,68,0.16)_1.2px,transparent_1.6px)] [background-size:12px_12px]" />

      {/* The student: as large as the panel allows, never cropped or stretched. */}
      <div className="absolute inset-0 flex items-center justify-center px-[6%] py-[4dvh]">
        <div className={cn('relative aspect-[892/1471] h-full max-h-[78dvh] max-w-full xl:max-h-[90dvh]', styles.studentIn)}>
          <div className="relative h-full w-full">
            <Image
              src="/images/login-girl.png"
              alt=""
              fill
              priority
              sizes="(min-width: 1024px) 45vw, 0px"
              // Mirrored so she faces the form; the photo ends at her jeans, so fade that edge.
              className="-scale-x-100 object-contain [mask-image:linear-gradient(to_bottom,black_86%,transparent_100%)]"
            />
          </div>
          {BADGES.map((badge) => (
            <FloatingBadge key={badge.lines.join(' ')} {...badge} />
          ))}
        </div>
      </div>
    </div>
  );
}
