import { CheckCircle2, Clock3 } from "lucide-react";

function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return hours > 0
    ? [hours, minutes, seconds]
        .map((part) => part.toString().padStart(2, "0"))
        .join(":")
    : [minutes, seconds]
        .map((part) => part.toString().padStart(2, "0"))
        .join(":");
}

export function ParticipantResultCompletion({
  description,
  durationSeconds,
}: {
  description: string;
  durationSeconds: number;
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
      role="status"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-emerald-700 shadow-sm">
          <CheckCircle2 aria-hidden="true" size={21} />
        </span>
        <div>
          <p className="text-lg font-semibold text-emerald-950">
            Assessment complete
          </p>
          <p className="mt-1 text-base leading-7 text-emerald-900">
            {description}
          </p>
        </div>
      </div>
      <span className="inline-flex items-center gap-2 self-start text-sm font-semibold tabular-nums text-emerald-800 sm:self-auto">
        <Clock3 aria-hidden="true" size={18} />
        Completed in {formatElapsed(durationSeconds)}
      </span>
    </div>
  );
}
