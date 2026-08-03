import { Building2, Users, ClipboardList, Star, MessageSquare, Check } from 'lucide-react';
import { useLang } from '../i18n/LanguageContext';
import { cn } from '@/lib/utils';

interface Props {
  currentIndex: number;
  total: number;
}

export default function StepIndicator({ currentIndex, total }: Props) {
  const { t } = useLang();
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
              <div
                className={cn(
                  'size-9 rounded-full flex items-center justify-center transition-all duration-300',
                  isCompleted && 'bg-primary text-primary-foreground',
                  isActive && 'bg-accent text-white ring-4 ring-accent/20',
                  !isCompleted && !isActive && 'bg-muted text-muted-foreground/40',
                )}
                title={step.label}
              >
                {isCompleted ? (
                  <Check className="size-4" strokeWidth={2.5} />
                ) : (
                  <Icon className="size-4" />
                )}
              </div>

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
