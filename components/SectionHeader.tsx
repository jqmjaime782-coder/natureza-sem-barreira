interface Props {
  icon: string;
  title: string;
  subtitle?: string;
}

export default function SectionHeader({ icon, title, subtitle }: Props) {
  return (
    <div className="flex items-center gap-3 mb-4 pb-3 border-b-2" style={{ borderColor: "#1A6B3A" }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ background: "#D6EAD8" }}>
        {icon}
      </div>
      <div>
        <h2 className="text-base font-bold" style={{ color: "#0D4424" }}>{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}
