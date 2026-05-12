import { useQuery, useLazyQuery } from '@apollo/client';
import { GET_EXAMINERS_PICKER_QUERY } from '../services/siteService';

interface ExaminerPick {
  id: string;
  examinerCode: string;
  name: string;
  role: string;
}

// Eager version — fires immediately (kept for any future consumers that need it)
export function useExaminersPicker(skip = false) {
  const { data, loading } = useQuery(GET_EXAMINERS_PICKER_QUERY, { skip });
  const examiners: ExaminerPick[] = data?.getExaminers?.rows ?? [];
  return { examiners, loading };
}

// Lazy version — fires only when load() is called (used for on-demand autocompletes)
export function useExaminersPickerLazy() {
  const [load, { data, loading }] = useLazyQuery(GET_EXAMINERS_PICKER_QUERY);
  const examiners: ExaminerPick[] = data?.getExaminers?.rows ?? [];
  return { load, examiners, loading };
}
