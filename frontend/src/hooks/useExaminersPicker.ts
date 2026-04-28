import { useQuery } from '@apollo/client';
import { GET_EXAMINERS_PICKER_QUERY } from '../services/siteService';

interface ExaminerPick {
  id: string;
  examinerCode: string;
  name: string;
  role: string;
}

export function useExaminersPicker(skip = false) {
  const { data, loading } = useQuery(GET_EXAMINERS_PICKER_QUERY, { skip });
  const examiners: ExaminerPick[] = data?.getExaminers?.rows ?? [];
  return { examiners, loading };
}
