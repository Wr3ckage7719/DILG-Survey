import { Building2, Users, ClipboardList, Star, MessageSquare, Check } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLang } from '../i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface Props {
  currentIndex: number;
  total: number;
}

export default function StepIndicator({ currentIndex, total }: Props) {
  const { t } = useLang();
  const prefersReduced = useReducedMotion();
  const STEPS = [
    { icon: Building2, label: t('indicator.office') },
    { icon: Users, label: t('indicator.demo') },
    { icon: ClipboardList, label: t('indicator.cc') },
    { icon: Star, label: t('indicator.quality') },
    { icon: MessageSquare, label: t('indicator.feedback') },
  ];

  return (
    <div className="mb-9 px-1">
      <div className="flex items-center justify-center">
        {STEPS.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isActive = i === currentIndex;
          const Icon = step.icon;

          return (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <motion.div
                className={cn(
                  'size-9 rounded-full flex items-center justify-center transition-colors duration-300',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'bg-accent text-white ring-4 ring-accent/20',
                  !isCompleted && !isActive && 'bg-muted text-muted-foreground/40',
                )}
                title={step.label}
                animate={
                  isActive && !prefersReduced
                    ? { scale: [1, 1.07, 1] }
                    : { scale: 1 }
                }
                transition={
                  isActive && !prefersReduced
                    ? { duration: 2.4, repeat: Infinity, ease: 'easeInOut' }
                    : undefined
                }
              >
                {isCompleted ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-4" />
                )}
              </motion.div>

              {i < total - 1 && (
                <div className="flex-1 h-[2px] mx-2">
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
