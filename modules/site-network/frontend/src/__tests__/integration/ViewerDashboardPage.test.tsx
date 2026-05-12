import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { ViewerDashboardPage } from '../../pages/viewer/DashboardPage';
import { GET_STUDIES_QUERY } from '../../services/studyService';
import { GET_SITES_QUERY } from '../../services/siteService';
import { GET_EXAMINERS_QUERY } from '../../services/examinerService';

vi.mock('../../components/shared/ViewerLayout', () => ({
  ViewerLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock chart.js to avoid canvas issues in jsdom
vi.mock('react-chartjs-2', () => ({
  Doughnut: () => <div data-testid="doughnut-chart">Doughnut</div>,
  Bar: () => <div data-testid="bar-chart">Bar</div>,
}));

const studiesMock = {
  request: { query: GET_STUDIES_QUERY, variables: { page: 1, pageSize: 1000 } },
  result: {
    data: {
      getStudies: {
        total: 3,
        rows: [
          { id: '1', protocolId: 'P-1', title: 'Study A', sponsor: 'S', phase: 'Phase I', startDate: '2025-01-01', endDate: '', status: 'Active', description: '' },
          { id: '2', protocolId: 'P-2', title: 'Study B', sponsor: 'S', phase: 'Phase II', startDate: '2025-01-01', endDate: '', status: 'Planned', description: '' },
          { id: '3', protocolId: 'P-3', title: 'Study C', sponsor: 'S', phase: 'Phase I', startDate: '2025-01-01', endDate: '2025-06-01', status: 'Completed', description: '' },
        ],
      },
    },
  },
};

const sitesMock = {
  request: { query: GET_SITES_QUERY, variables: { page: 1, pageSize: 1000 } },
  result: {
    data: {
      getSites: {
        total: 2,
        rows: [
          { id: '1', siteCode: 'S-1', name: 'Site A', city: 'London', country: 'UK', status: 'Active' },
          { id: '2', siteCode: 'S-2', name: 'Site B', city: 'Tokyo', country: 'Japan', status: 'Planned' },
        ],
      },
    },
  },
};

const examinersMock = {
  request: { query: GET_EXAMINERS_QUERY, variables: { page: 1, pageSize: 1000 } },
  result: {
    data: {
      getExaminers: {
        total: 1,
        rows: [
          { id: '1', examinerCode: 'E-1', name: 'Dr. A', specialty: 'Cardiology', email: 'a@t.com', role: 'Principal Investigator', status: 'Active' },
        ],
      },
    },
  },
};

function renderPage() {
  return render(
    <MockedProvider mocks={[studiesMock, sitesMock, examinersMock]} addTypename={false}>
      <MemoryRouter>
        <ViewerDashboardPage />
      </MemoryRouter>
    </MockedProvider>
  );
}

describe('ViewerDashboardPage', () => {
  it('renders Dashboard heading after data loads', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });

  it('renders stat cards with correct values', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Total Studies')).toBeInTheDocument());
    expect(screen.getAllByText('3').length).toBeGreaterThan(0); // total studies (stat card + chip)
    expect(screen.getByText('Active Sites')).toBeInTheDocument();
    expect(screen.getByText('Active Examiners')).toBeInTheDocument();
  });

  it('renders chart sections', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Studies by Status')).toBeInTheDocument());
    expect(screen.getByText('Studies by Phase')).toBeInTheDocument();
    expect(screen.getByTestId('doughnut-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });

  it('renders Recent Studies section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Recent Studies')).toBeInTheDocument());
    expect(screen.getByText('Study A')).toBeInTheDocument();
  });

  it('renders Sites by Country section', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Sites by Country')).toBeInTheDocument());
    expect(screen.getByText('UK')).toBeInTheDocument();
    expect(screen.getByText('Japan')).toBeInTheDocument();
  });

  it('does not render specialty chart (viewer-only)', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dashboard'));
    expect(screen.queryByText(/specialty/i)).not.toBeInTheDocument();
  });
});
