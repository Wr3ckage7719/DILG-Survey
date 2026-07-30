import { motion } from 'framer-motion';
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
      <div className="flex items-start justify-center gap-1">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const isPending = i > currentIndex;
          const Icon = step.icon;

          return (
            <div key={i} className="flex items-start flex-1">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div className="relative flex items-center justify-center">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300',
                      isCompleted && 'bg-primary text-primary-foreground',
                      isActive && 'bg-gold text-gold-foreground',
                      isPending && 'border-2 border-muted-foreground/25 text-muted-foreground/40 bg-transparent',
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                    ) : (
                      <Icon className="w-3.5 h-3.5" />
                    )}
                  </div>

                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-gold/60"
                      animate={{ scale: [1, 1.35, 1], opacity: [0.6, 0, 0.6] }}
                      transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}
                </div>

                <span
                  className={cn(
                    'text-[10px] font-semibold tracking-tight uppercase transition-colors duration-300 text-center leading-tight',
                    isActive && 'text-gold',
                    isCompleted && 'text-primary/70',
                    isPending && 'text-muted-foreground/40',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {i < total - 1 && (
                <div className="flex-1 h-px mt-3.5 mx-0.5">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      i < currentIndex ? 'bg-primary' : 'bg-muted-foreground/20',
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
