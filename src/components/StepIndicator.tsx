import { SECTIONS, SECTION_LABELS, type SectionId } from '../types';

interface Props {
  currentIndex: number;
  total: number;
  currentSectionId: SectionId;
}

export default function StepIndicator({ currentIndex, total, currentSectionId }: Props) {
  return (
    <div className="mb-6">
      {/* Dots + lines */}
      <div className="flex items-center justify-between">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex items-center flex-1">
            {/* Dot */}
            <div
              className={`rounded-full flex items-center justify-center transition-colors ${
                i < currentIndex
                  ? 'bg-primary w-3 h-3'
                  : i === currentIndex
                  ? 'bg-primary w-3.5 h-3.5 ring-2 ring-primary/30'
                  : 'bg-muted-foreground/25 w-3 h-3'
              }`}
            >
              {i < currentIndex && (
                <svg className="w-2 h-2 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>

            {/* Line to next dot */}
            {i < total - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1.5 ${
                  i < currentIndex ? 'bg-primary' : 'bg-muted-foreground/25'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Numbers */}
      <div className="flex justify-between mt-1.5 mb-3">
        {SECTIONS.map((_, i) => (
          <span
            key={i}
            className={`text-[10px] font-medium ${
              i <= currentIndex ? 'text-primary' : 'text-muted-foreground/40'
            }`}
          >
            {i + 1}
          </span>
        ))}
      </div>

      {/* Current section label */}
      <p className="text-xs font-medium text-center text-muted-foreground">
        {SECTION_LABELS[currentSectionId]}
      </p>
    </div>
  );
}
