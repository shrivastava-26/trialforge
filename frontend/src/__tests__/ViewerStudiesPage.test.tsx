import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ViewerStudiesPage } from '../pages/viewer/StudiesPage';
import { GET_STUDIES_QUERY } from '../services/studyService';

// Mock ViewerLayout to avoid sidebar/header complexity
vi.mock('../components/shared/ViewerLayout', () => ({
  ViewerLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const studiesData = {
  getStudies: {
    total: 2,
    rows: [
      { id: '1', protocolId: 'P-001', title: 'Alpha Trial', sponsor: 'Pharma', phase: 'Phase I', startDate: '2025-01-01', endDate: '', status: 'Planned', description: '' },
      { id: '2', protocolId: 'P-002', title: 'Beta Study', sponsor: 'BioTech', phase: 'Phase II', startDate: '2025-02-01', endDate: '', status: 'Active', description: '' },
    ],
  },
};

const emptyData = {
  getStudies: { total: 0, rows: [] },
};

function makeStudiesMock(data = studiesData, page = 1, pageSize = 10) {
  return {
    request: { query: GET_STUDIES_QUERY, variables: { page, pageSize } },
    result: { data },
  };
}

function renderPage(mocks: object[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={['/viewer/studies']}>
        <Routes>
          <Route path="/viewer/studies" element={<ViewerStudiesPage />} />
          <Route path="/viewer/studies/:id" element={<div>Study Detail</div>} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>
  );
}

describe('ViewerStudiesPage', () => {
  it('renders page heading', () => {
    renderPage([makeStudiesMock()]);
    expect(screen.getByText('Studies')).toBeInTheDocument();
  });

  it('renders study rows after data loads', async () => {
    renderPage([makeStudiesMock()]);
    await waitFor(() => expect(screen.getByText('Alpha Trial')).toBeInTheDocument());
    expect(screen.getByText('Beta Study')).toBeInTheDocument();
    expect(screen.getByText('P-001')).toBeInTheDocument();
  });

  it('renders in read-only mode — no Create/Edit buttons', async () => {
    renderPage([makeStudiesMock()]);
    await waitFor(() => screen.getByText('Alpha Trial'));
    expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('navigates to study detail on row click', async () => {
    renderPage([makeStudiesMock()]);
    await waitFor(() => screen.getByText('Alpha Trial'));
    await userEvent.click(screen.getByText('Alpha Trial'));
    await waitFor(() => expect(screen.getByText('Study Detail')).toBeInTheDocument());
  });

  it('shows error alert on query failure', async () => {
    const errorMock = {
      request: { query: GET_STUDIES_QUERY, variables: { page: 1, pageSize: 10 } },
      error: new Error('Network error'),
    };
    renderPage([errorMock]);
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
