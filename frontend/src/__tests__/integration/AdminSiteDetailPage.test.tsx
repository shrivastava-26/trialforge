import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { AdminSiteDetailPage } from '../../pages/admin/SiteDetailPage';
import { GET_SITE_QUERY } from '../../services/siteService';
import { UNASSIGN_EXAMINER_FROM_SITE } from '../../services/adminService';

vi.mock('../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const SITE_ID = '15';

const siteData = {
  getSite: {
    id: SITE_ID,
    siteCode: 'SD-001',
    name: 'Detail Site',
    city: 'Berlin',
    country: 'Germany',
    status: 'Active',
    studies: [{ id: '1', protocolId: 'P-001', title: 'Linked Study', status: 'Active' }],
    examiners: [
      { id: '30', examinerCode: 'EX-030', name: 'Dr. Assigned', specialty: 'Cardiology', role: 'Principal Investigator', status: 'Active' },
    ],
  },
};

function makeSiteMock(data = siteData) {
  return {
    request: { query: GET_SITE_QUERY, variables: { id: SITE_ID } },
    result: { data },
  };
}

const unassignMock = {
  request: {
    query: UNASSIGN_EXAMINER_FROM_SITE,
    variables: { siteId: SITE_ID, examinerId: '30' },
  },
  result: { data: { unassignExaminerFromSite: true } },
};

function renderPage(mocks: object[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[`/admin/sites/${SITE_ID}`]}>
          <Routes>
            <Route path="/admin/sites/:id" element={<AdminSiteDetailPage />} />
            <Route path="/admin/sites/:id/history" element={<div>History</div>} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </MockedProvider>
  );
}

describe('AdminSiteDetailPage', () => {
  it('renders site details after loading', async () => {
    renderPage([makeSiteMock()]);
    await waitFor(() => expect(screen.getByText('Detail Site')).toBeInTheDocument());
    expect(screen.getAllByText('SD-001').length).toBeGreaterThan(0);
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Germany')).toBeInTheDocument();
  });

  it('renders assigned examiner in the table', async () => {
    renderPage([makeSiteMock()]);
    await waitFor(() => expect(screen.getByText('Dr. Assigned')).toBeInTheDocument());
    expect(screen.getByText('EX-030')).toBeInTheDocument();
  });

  it('renders linked studies', async () => {
    renderPage([makeSiteMock()]);
    await waitFor(() => expect(screen.getByText('Linked Study')).toBeInTheDocument());
  });

  it('shows History button', async () => {
    renderPage([makeSiteMock()]);
    await waitFor(() => screen.getByText('Detail Site'));
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
  });

  it('shows Assign an Examiner section', async () => {
    renderPage([makeSiteMock()]);
    await waitFor(() => screen.getByText('Detail Site'));
    expect(screen.getByText(/assign an examiner/i)).toBeInTheDocument();
  });

  it('fires unassign mutation when clicking Unassign button', async () => {
    const siteAfterUnassign = { getSite: { ...siteData.getSite, examiners: [] } };
    renderPage([makeSiteMock(), unassignMock, makeSiteMock(siteAfterUnassign)]);
    await waitFor(() => screen.getByText('Dr. Assigned'));
    await userEvent.click(screen.getByRole('button', { name: /unassign/i }));
    await waitFor(() => expect(screen.getByText(/unassigned from site/i)).toBeInTheDocument());
  });
});
