import { type SectionId } from '../types';

interface Props {
  currentIndex: number;
  total: number;
  currentSectionId: SectionId;
}

const LABELS: Record<SectionId, string> = {
  office: 'Detalye ng Tanggapan',
  demographics: 'Demograpiko',
  cc: 'Gabay ng Mamamayan',
  sqd: 'Kalidad ng Serbisyo',
  feedback: 'Puná at Impormasyon',
};

export default function StepIndicator({ currentIndex, total, currentSectionId }: Props) {
  return (
    <div className="mb-6">
      {/* Dashes row */}
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-colors ${
              i <= currentIndex ? 'bg-primary' : 'bg-muted-foreground/25'
            }`}
            style={{ width: i === currentIndex ? '36px' : '28px' }}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-xs text-muted-foreground text-center mt-2.5">
        {currentIndex + 1} / {total} &middot; {LABELS[currentSectionId]}
      </p>
    </div>
  );
}
