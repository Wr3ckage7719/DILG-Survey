import { Building2, Users, ClipboardList, Star, MessageSquare, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  currentIndex: number;
  total: number;
}

const STEPS = [
  { icon: Building2, label: 'Tanggapan' },
  { icon: Users, label: 'Demo' },
  { icon: ClipboardList, label: 'CC' },
  { icon: Star, label: 'Kalidad' },
  { icon: MessageSquare, label: 'Puná' },
];

export default function StepIndicator({ currentIndex, total }: Props) {
  return (
    <div className="mb-8 px-1">
      <div className="flex items-center justify-center">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const Icon = step.icon;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'size-9 rounded-full flex items-center justify-center transition-all duration-300',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isActive && 'bg-accent text-white ring-4 ring-accent/20',
                    !isCompleted && !isActive && 'bg-muted text-muted-foreground/40',
                  )}
                >
                  {isCompleted ? (
                    <Check className="size-4" strokeWidth={2.5} />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <span
                  className={cn(
                    'text-[10px] font-semibold tracking-tight uppercase text-center leading-tight',
                    isActive && 'text-accent',
                    isCompleted && 'text-primary/70',
                    !isCompleted && !isActive && 'text-muted-foreground/40',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {i < total - 1 && (
                <div className="flex-1 h-[2px] mx-2 mt-[-18px]">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      i < currentIndex ? 'bg-primary' : 'bg-muted-foreground/15',
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
