"use client";

const LABELS: Record<number, string> = {
  1: "Inexistente",
  2: "Muito Baixa",
  3: "Moderada",
  4: "Boa",
  5: "Excelente",
};

interface Props {
  value: number | null;
  onChange: (v: number) => void;
}

export default function ScaleInput({ value, onChange }: Props) {
  return (
    <div className="flex gap-1 flex-wrap">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`scale-btn scale-${n} ${value === n ? "selected" : ""}`}
          title={LABELS[n]}
        >
          {n}
        </button>
      ))}
      {value && (
        <span className="text-xs text-gray-400 self-center ml-1">{LABELS[value]}</span>
      )}
    </div>
  );
}
