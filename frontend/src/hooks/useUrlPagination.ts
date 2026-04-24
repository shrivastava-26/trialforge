import { useSearchParams } from 'react-router-dom';
import { GridPaginationModel } from '@mui/x-data-grid';

/**
 * Persists MUI DataGrid pagination state in the URL as ?page=N&pageSize=N.
 * When the user navigates back, the browser restores the URL and the table
 * re-renders at the exact page they were on.
 */
export function useUrlPagination(defaultPageSize = 10): [GridPaginationModel, (model: GridPaginationModel) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(0, Number(searchParams.get('page') ?? 0));
  const pageSize = Number(searchParams.get('pageSize') ?? defaultPageSize);

  const paginationModel: GridPaginationModel = { page, pageSize };

  function setPaginationModel(model: GridPaginationModel) {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('page', String(model.page));
        next.set('pageSize', String(model.pageSize));
        return next;
      },
      { replace: true } // replace so back button skips intermediate page changes
    );
  }

  return [paginationModel, setPaginationModel];
}
