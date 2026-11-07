export function Switch({
  checked,
  onChange,
  labelledBy,
  describedBy,
}: Readonly<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  labelledBy: string;
  describedBy?: string;
}>) {
  return (
    <button
      type="button"
      role="switch"
      className="pano-switch"
      aria-checked={checked}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}
