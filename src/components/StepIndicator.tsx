interface Props {
  currentIndex: number;
  total: number;
}

const LABELS = [
  'Detalye ng Tanggapan',
  'Demograpiko',
  'CC',
  'Kalidad ng Serbisyo',
  'Puná',
];

export default function StepIndicator({ currentIndex, total }: Props) {
  return (
    <div className="mb-8 space-y-3">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all ${
              i <= currentIndex ? 'bg-primary' : 'bg-muted-foreground/25'
            }`}
            style={{ width: i === currentIndex ? '36px' : '28px' }}
          />
        ))}
      </div>
      <p className="text-center text-xs font-semibold tracking-wide uppercase text-primary/70">
        {LABELS[currentIndex]}
      </p>
    </div>
  );
}
