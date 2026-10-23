export function Pill({ value }: { value: string }) {
  return <span className={`pill ${value.toLowerCase()}`}>{value.toLowerCase()}</span>;
}
