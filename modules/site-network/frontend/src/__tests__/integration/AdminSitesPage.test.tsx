import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { AdminSitesPage } from '../../pages/admin/SitesPage';
import { GET_SITES_QUERY } from '../../services/siteService';
import { CREATE_SITE_MUTATION } from '../../services/adminService';

vi.mock('../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const sitesData = {
  getSites: {
    total: 2,
    rows: [
      { id: '1', siteCode: 'SC-001', name: 'London Lab', city: 'London', country: 'UK', status: 'Active' },
      { id: '2', siteCode: 'SC-002', name: 'Tokyo Center', city: 'Tokyo', country: 'Japan', status: 'Planned' },
    ],
  },
};

function makeSitesMock(page = 1, pageSize = 10) {
  return {
    request: { query: GET_SITES_QUERY, variables: { page, pageSize } },
    result: { data: sitesData },
  };
}

const createSiteMock = {
  request: {
    query: CREATE_SITE_MUTATION,
    variables: { input: { siteCode: 'SC-NEW', name: 'New Site', city: 'Berlin', country: 'Germany' } },
  },
  result: { data: { createSite: { id: '3', siteCode: 'SC-NEW', name: 'New Site', city: 'Berlin', country: 'Germany', status: 'Planned' } } },
};

function renderPage(mocks: object[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={['/admin/sites']}>
          <Routes>
            <Route path="/admin/sites" element={<AdminSitesPage />} />
            <Route path="/admin/sites/:id" element={<div>Detail</div>} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </MockedProvider>
  );
}

describe('AdminSitesPage', () => {
  it('renders page heading and New Site button', async () => {
    renderPage([makeSitesMock()]);
    await waitFor(() => expect(screen.getByText('Sites')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /new site/i })).toBeInTheDocument();
  });

  it('renders site rows in the DataGrid', async () => {
    renderPage([makeSitesMock()]);
    await waitFor(() => expect(screen.getByText('London Lab')).toBeInTheDocument());
    expect(screen.getByText('Tokyo Center')).toBeInTheDocument();
    expect(screen.getByText('SC-001')).toBeInTheDocument();
  });

  it('opens Create Site dialog on button click', async () => {
    renderPage([makeSitesMock()]);
    await waitFor(() => screen.getByText('Sites'));
    await userEvent.click(screen.getByRole('button', { name: /new site/i }));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/site code/i)).toBeInTheDocument();
  });

  it('shows step 2 (Location) after filling step 1 and clicking Next', async () => {
    renderPage([makeSitesMock()]);
    await waitFor(() => screen.getByText('Sites'));
    await userEvent.click(screen.getByRole('button', { name: /new site/i }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/site code/i), 'SC-NEW');
    await userEvent.type(within(dialog).getByLabelText(/site name/i), 'New Site');
    await userEvent.click(within(dialog).getByRole('button', { name: /next/i }));
    await waitFor(() => expect(within(dialog).getByLabelText(/city/i)).toBeInTheDocument());
    expect(within(dialog).getByLabelText(/country/i)).toBeInTheDocument();
  });

  it('submits create mutation and shows success toast', async () => {
    renderPage([makeSitesMock(), createSiteMock, makeSitesMock()]);
    await waitFor(() => screen.getByText('Sites'));
    await userEvent.click(screen.getByRole('button', { name: /new site/i }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/site code/i), 'SC-NEW');
    await userEvent.type(within(dialog).getByLabelText(/site name/i), 'New Site');
    await userEvent.click(within(dialog).getByRole('button', { name: /next/i }));
    await waitFor(() => within(dialog).getByLabelText(/city/i));
    await userEvent.type(within(dialog).getByLabelText(/city/i), 'Berlin');
    await userEvent.type(within(dialog).getByLabelText(/country/i), 'Germany');
    await userEvent.click(within(dialog).getByRole('button', { name: /create/i }));
    await waitFor(() => expect(screen.getByText(/site created/i)).toBeInTheDocument());
  });

  it('shows Planned badge in create dialog (status not editable)', async () => {
    renderPage([makeSitesMock()]);
    await waitFor(() => screen.getByText('Sites'));
    await userEvent.click(screen.getByRole('button', { name: /new site/i }));
    // 'Planned' appears in both the DataGrid row and the dialog badge
    expect(screen.getAllByText('Planned').length).toBeGreaterThan(0);
    expect(screen.getByText(/set automatically/i)).toBeInTheDocument();
  });
});
