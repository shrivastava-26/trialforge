import { useSearchParams } from 'react-router-dom';
import { GridPaginationModel } from '@mui/x-data-grid';

const VALID_PAGE_SIZES = [10, 20, 25, 50, 100];

/**
 * Persists MUI DataGrid pagination state in the URL as ?page=N&pageSize=N.
 * When the user navigates back, the browser restores the URL and the table
 * re-renders at the exact page they were on.
 * pageSize is clamped to VALID_PAGE_SIZES to prevent bad URL params from
 * triggering a backend validation error.
 */
export function useUrlPagination(defaultPageSize = 10): [GridPaginationModel, (model: GridPaginationModel) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = Math.max(0, Number(searchParams.get('page') ?? 0));

  // Clamp pageSize to the nearest valid option; fall back to defaultPageSize
  const rawPageSize = Number(searchParams.get('pageSize') ?? defaultPageSize);
  const pageSize = VALID_PAGE_SIZES.includes(rawPageSize) ? rawPageSize : defaultPageSize;

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
