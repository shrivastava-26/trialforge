import { ReactNode } from 'react';
import { ViewerLayout } from '../../components/shared/ViewerLayout';
import { SearchPage } from '../shared/SearchPage';

export function ViewerSearchPage() {
  return (
    <SearchPage
      baseRoute="/viewer"
      layout={(children: ReactNode) => <ViewerLayout>{children}</ViewerLayout>}
    />
  );
}
