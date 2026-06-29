/**
 * JobConditions — the shared answer picker for the authored estimation questions.
 *
 * Each question offers its answers; a chosen answer may raise a flag that pricing
 * rules act on. Controlled (the caller owns the answers map) so it can sit inside
 * either estimate surface. `flagsFromAnswers` distils the raised flags for the
 * `estimate` pipeline. Renders nothing when no questions are authored.
 */

import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { useAdminQuestionsStore, type AdminQuestion } from "@/store/admin-questions.store";
import { FIELD } from "./labels";

/** The distinct flags raised by the chosen answers. */
export const flagsFromAnswers = (questions: AdminQuestion[], answers: Record<string, string>): string[] =>
  Object.entries(answers).flatMap(([qId, oId]) => {
    const option = questions.find((q) => q.id === qId)?.options.find((o) => o.id === oId);
    return option?.flag ? [option.flag] : [];
  });

interface Props {
  answers: Record<string, string>;
  onChange: (questionId: string, optionId: string) => void;
}

export const JobConditions = ({ answers, onChange }: Props) => {
  const { t } = useTranslation();
  const questions = useAdminQuestionsStore((s) => s.questions);
  if (questions.length === 0) return null;

  return (
    <div className="space-y-2 border-t pt-3">
      {questions.map((q) => (
        <div key={q.id} className="grid grid-cols-[1fr_10rem] items-center gap-2">
          <span className="truncate text-sm text-ink-2">{q.text || t("admin.questionText")}</span>
          <select
            value={answers[q.id] ?? ""}
            onChange={(e) => onChange(q.id, e.target.value)}
            aria-label={q.text || t("admin.questionText")}
            className={cn(FIELD, "w-full")}
          >
            <option value="">—</option>
            {q.options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label || t("admin.answerLabel")}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
};
