import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { AuditLogsPage } from '../../pages/admin/AuditLogsPage';
import { GET_AUDIT_LOGS_QUERY } from '../../services/adminService';

vi.mock('../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const auditData = {
  getAuditLogs: {
    total: 2,
    rows: [
      {
        id: '1', actorEmail: 'admin@test.com', action: 'CREATE', entityType: 'Study',
        entityId: 10, beforeJson: null, afterJson: JSON.stringify({ protocolId: 'P-001', title: 'New Study' }),
        createdAt: '2025-01-15T10:00:00Z',
      },
      {
        id: '2', actorEmail: 'admin@test.com', action: 'ASSIGN', entityType: 'StudySite',
        entityId: 10, beforeJson: null, afterJson: JSON.stringify({ studyId: 10, siteId: 5 }),
        createdAt: '2025-01-15T11:00:00Z',
      },
    ],
  },
};

function makeAuditMock(entityType?: string) {
  return {
    request: {
      query: GET_AUDIT_LOGS_QUERY,
      variables: { entityType: entityType || undefined, page: 1, pageSize: 25 },
    },
    result: { data: auditData },
  };
}

const filteredData = {
  getAuditLogs: {
    total: 1,
    rows: [auditData.getAuditLogs.rows[0]],
  },
};

const filteredMock = {
  request: {
    query: GET_AUDIT_LOGS_QUERY,
    variables: { entityType: 'Study', page: 1, pageSize: 25 },
  },
  result: { data: filteredData },
};

function renderPage(mocks: object[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={['/admin/audit-logs']}>
        <AuditLogsPage />
      </MemoryRouter>
    </MockedProvider>
  );
}

describe('AuditLogsPage', () => {
  it('renders page heading and filter dropdown', async () => {
    renderPage([makeAuditMock()]);
    await waitFor(() => expect(screen.getByText('Audit Logs')).toBeInTheDocument());
    expect(screen.getByLabelText(/filter by entity/i)).toBeInTheDocument();
  });

  it('renders audit log rows in the table', async () => {
    renderPage([makeAuditMock()]);
    await waitFor(() => expect(screen.getAllByText('admin@test.com').length).toBeGreaterThan(0));
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByText('ASSIGN')).toBeInTheDocument();
    expect(screen.getByText('Study')).toBeInTheDocument();
    expect(screen.getByText('StudySite')).toBeInTheDocument();
  });

  it('expands a row to show diff detail on click', async () => {
    renderPage([makeAuditMock()]);
    await waitFor(() => screen.getByText('CREATE'));
    // Click the first row to expand
    const rows = screen.getAllByRole('row');
    // rows[0] is header, rows[1] is first data row
    await userEvent.click(rows[1]);
    await waitFor(() => expect(screen.getByText(/P-001/)).toBeInTheDocument());
    expect(screen.getByText(/New Study/)).toBeInTheDocument();
  });

  it('shows "No audit log entries found" when empty', async () => {
    const emptyMock = {
      request: { query: GET_AUDIT_LOGS_QUERY, variables: { entityType: undefined, page: 1, pageSize: 25 } },
      result: { data: { getAuditLogs: { total: 0, rows: [] } } },
    };
    renderPage([emptyMock]);
    await waitFor(() => expect(screen.getByText(/no audit log entries found/i)).toBeInTheDocument());
  });
});
