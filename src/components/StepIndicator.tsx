interface Props {
  currentIndex: number;
  total: number;
}

export default function StepIndicator({ currentIndex, total }: Props) {
  return (
    <div>
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
    </div>
  );
}
