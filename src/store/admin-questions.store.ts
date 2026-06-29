/**
 * admin-questions.store — the questions that capture job conditions during
 * estimation. Each question offers mutually-exclusive answers; an answer may
 * raise a **flag** (a stable string id) that pricing rules later act on.
 *
 * Authoring-only for now: persists to localStorage and isn't consumed by the
 * editor yet — staging for a future estimation engine.
 */

import { create } from "zustand";
import { uid } from "@/lib/uid";

/** One answer to a question — its label and the flag it raises (optional). */
export interface AdminQuestionOption {
  id: string;
  /** Answer label. */
  label: string;
  /** Flag id this answer raises (consumed by pricing rules); "" = none. */
  flag: string;
}

/** A question that captures a job condition through its answers. */
export interface AdminQuestion {
  id: string;
  /** The prompt shown to the user. */
  text: string;
  /** Mutually-exclusive answers; each may raise a flag. */
  options: AdminQuestionOption[];
}

const QUESTIONS_KEY = "mehdify.admin.questions.v1";

const loadQuestions = (): AdminQuestion[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUESTIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdminQuestion[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((q) => ({
      id: q.id,
      text: q.text,
      options: Array.isArray(q.options)
        ? q.options.map((o) => ({ id: o.id, label: o.label, flag: o.flag ?? "" }))
        : [],
    }));
  } catch {
    return [];
  }
};

const persist = (questions: AdminQuestion[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(questions));
  } catch {
    /* quota / private mode — keep the in-memory copy */
  }
};

interface AdminQuestionsStore {
  questions: AdminQuestion[];
  /** Append a fresh question with one starter answer. */
  addQuestion: () => void;
  updateQuestion: (id: string, text: string) => void;
  removeQuestion: (id: string) => void;
  /** Each question owns N answers; an answer may raise a flag. */
  addOption: (questionId: string) => void;
  updateOption: (questionId: string, optionId: string, patch: Partial<Omit<AdminQuestionOption, "id">>) => void;
  removeOption: (questionId: string, optionId: string) => void;
}

export const useAdminQuestionsStore = create<AdminQuestionsStore>((set, get) => {
  const commit = (questions: AdminQuestion[]) => {
    persist(questions);
    set({ questions });
  };
  const mapQuestion = (id: string, fn: (q: AdminQuestion) => AdminQuestion) =>
    commit(get().questions.map((q) => (q.id === id ? fn(q) : q)));

  const freshOption = (): AdminQuestionOption => ({ id: uid(), label: "", flag: "" });

  return {
    questions: loadQuestions(),

    addQuestion: () => commit([...get().questions, { id: uid(), text: "", options: [freshOption()] }]),
    updateQuestion: (id, text) => mapQuestion(id, (q) => ({ ...q, text })),
    removeQuestion: (id) => commit(get().questions.filter((q) => q.id !== id)),

    addOption: (questionId) => mapQuestion(questionId, (q) => ({ ...q, options: [...q.options, freshOption()] })),
    updateOption: (questionId, optionId, patch) =>
      mapQuestion(questionId, (q) => ({
        ...q,
        options: q.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
      })),
    removeOption: (questionId, optionId) =>
      mapQuestion(questionId, (q) => ({ ...q, options: q.options.filter((o) => o.id !== optionId) })),
  };
});
