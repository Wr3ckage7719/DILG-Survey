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
      {/* Segmented line */}
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`flex-1 transition-colors ${
              i <= currentIndex ? 'bg-primary' : 'bg-muted'
            } ${i > 0 ? 'ml-0.5' : ''}`}
          />
        ))}
      </div>

      {/* Step label */}
      <p className="text-xs text-muted-foreground text-center mt-2">
        {currentIndex + 1} / {total} &middot; {LABELS[currentSectionId]}
      </p>
    </div>
  );
}
