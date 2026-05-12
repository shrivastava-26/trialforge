import { ReactNode } from 'react';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { SearchPage } from '../shared/SearchPage';

export function AdminSearchPage() {
  return (
    <SearchPage
      baseRoute="/admin"
      layout={(children: ReactNode) => <AdminLayout>{children}</AdminLayout>}
    />
  );
}
