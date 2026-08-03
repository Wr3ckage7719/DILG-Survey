import { useState } from 'react';
import { motion } from 'framer-motion';
import { Flag, Globe, Languages, Check, ChevronLeft } from 'lucide-react';
import type { Language } from '../types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MotionButton = motion.create(Button);

interface Props {
  onSelect: (lang: Language) => void;
  onBack: () => void;
}

const OPTIONS: { lang: Language; name: string; desc: string; icon: typeof Flag }[] = [
  { lang: 'tl', name: 'Filipino (Tagalog)', desc: 'Wikang pambansa', icon: Flag },
  { lang: 'en', name: 'English', desc: 'The English language', icon: Globe },
];

export default function LanguagePicker({ onSelect, onBack }: Props) {
  const [selected, setSelected] = useState<Language | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center p-5 bg-white">
      <div className="max-w-lg w-full space-y-5 text-center">
        {/* DILG header */}
        <div className="flex items-center justify-center">
          <img
            src="/logo-2.png"
            alt="DILG Logo"
            className="h-12 object-contain"
          />
        </div>

        {/* Heading — bilingual since language is not yet chosen */}
        <div className="space-y-2">
          <h1 className="flex items-center justify-center gap-2.5 text-2xl font-extrabold tracking-tight text-foreground">
            <span className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Languages className="size-5 text-foreground/70" />
            </span>
            Pumili ng Wika
          </h1>
          <p className="text-sm text-muted-foreground">
            Piliin ang wika na inyong gagamitin sa sarbey. / Select the language you will use for the survey.
          </p>
        </div>

        {/* Language cards */}
        <div className="grid gap-3" role="radiogroup" aria-label="Language selection">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selected === opt.lang;
            return (
              <button
                key={opt.lang}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelected(opt.lang)}
                className={cn(
                  'flex w-full items-center gap-4 rounded-2xl border px-5 py-4 text-left transition-colors duration-200 cursor-pointer',
                  isSelected
                    ? 'border-accent/20 bg-accent/[0.04]'
                    : 'border-border/80 bg-card hover:bg-accent/5 hover:border-border',
                )}
              >
                <span className="size-11 shrink-0 rounded-full bg-muted flex items-center justify-center">
                  <Icon className="size-5 text-foreground/80" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[15px] font-semibold text-foreground">{opt.name}</span>
                  <span className="block text-xs text-muted-foreground">{opt.desc}</span>
                </span>
                {isSelected && (
                  <motion.span
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="size-6 shrink-0 rounded-full bg-accent text-white flex items-center justify-center"
                  >
                    <Check className="size-3.5" strokeWidth={3} />
                  </motion.span>
                )}
              </button>
            );
          })}
        </div>

        {/* Continue — label follows the chosen language */}
        <MotionButton
          onClick={() => selected && onSelect(selected)}
          disabled={!selected}
          size="lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: selected ? 1 : 0.4, y: 0 }}
          className="w-full rounded-full bg-primary hover:bg-primary/90 text-white font-semibold py-6 text-base"
        >
          {selected === 'en' ? 'Continue' : 'Magpatuloy'}
        </MotionButton>

        <Button
          variant="ghost"
          onClick={onBack}
          className="mx-auto text-muted-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Bumalik / Back
        </Button>
      </div>
    </div>
  );
}
