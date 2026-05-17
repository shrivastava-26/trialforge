import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestWrapper } from './helpers';

const mockAuth = {
  isLoggedIn: true,
  email: 'test@example.com',
  roles: [] as string[],
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('../auth', () => ({
  useAuth: () => mockAuth,
  ROLES: {
    ADMIN: 'ADMIN',
    VIEWER: 'VIEWER',
    CRO_MANAGER: 'CRO_MANAGER',
    SITE_COORDINATOR: 'SITE_COORDINATOR',
    DATA_MANAGER: 'DATA_MANAGER',
    MONITOR: 'MONITOR',
    AUDITOR: 'AUDITOR',
  },
}));

const mockQuery = vi.fn();

vi.mock('../apollo', () => ({
  gatewayClient: { query: (...args: unknown[]) => mockQuery(...args) },
  setEnqueueError: vi.fn(),
}));

import { DashboardPage } from '../pages/DashboardPage';

const metricsData = {
  patientsTotal: 100,
  patientsEnrolled: 80,
  patientsArchived: 5,
  visitsPlanned: 200,
  visitsCompleted: 150,
  visitsMissed: 10,
  formsActive: 30,
  formInstancesDraft: 20,
  formInstancesSubmitted: 50,
  queriesOpen: 12,
  queriesAnswered: 8,
  queriesClosed: 40,
  documentsTotal: 60,
  documentsArchived: 10,
  documentVersionsTotal: 90,
};

describe('DashboardPage', () => {
  beforeEach(() => {
    mockAuth.roles = ['ADMIN'];
    mockQuery.mockReset();
  });

  it('does not fetch metrics until button is clicked', () => {
    render(
      <TestWrapper initialEntries={['/dashboard']}>
        <DashboardPage />
      </TestWrapper>,
    );

    expect(screen.queryByTestId('metrics-grid')).not.toBeInTheDocument();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('renders metrics cards after clicking Load Metrics', async () => {
    mockQuery.mockResolvedValueOnce({ data: { getDashboardMetrics: metricsData } });

    render(
      <TestWrapper initialEntries={['/dashboard']}>
        <DashboardPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Load Metrics'));

    await waitFor(() => {
      expect(screen.getByText('100')).toBeInTheDocument();
    });
    expect(screen.getByText('Patients Total')).toBeInTheDocument();
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('does not render __typename as a metric card', async () => {
    mockQuery.mockResolvedValueOnce({
      data: { getDashboardMetrics: { __typename: 'DashboardMetrics', ...metricsData } },
    });

    render(
      <TestWrapper initialEntries={['/dashboard']}>
        <DashboardPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Load Metrics'));

    await waitFor(() => {
      expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
    });

    expect(screen.queryByText('__typename')).not.toBeInTheDocument();
    expect(screen.queryByText('DashboardMetrics')).not.toBeInTheDocument();
  });

  it('SITE_COORDINATOR blocked unless siteId provided (does not call query)', () => {
    mockAuth.roles = ['SITE_COORDINATOR'];

    render(
      <TestWrapper initialEntries={['/dashboard']}>
        <DashboardPage />
      </TestWrapper>,
    );

    expect(
      screen.getByText('Please provide a Site ID to view metrics.'),
    ).toBeInTheDocument();

    // Clicking without siteId does nothing
    fireEvent.click(screen.getByText('Load Metrics'));
    expect(mockQuery).not.toHaveBeenCalled();
    expect(screen.queryByTestId('metrics-grid')).not.toBeInTheDocument();
  });

  it('admin with role string only (roles undefined) does not crash', async () => {
    // Simulate AuthContext providing roles as undefined (backend returned role string)
    (mockAuth as any).roles = undefined;

    render(
      <TestWrapper initialEntries={['/dashboard']}>
        <DashboardPage />
      </TestWrapper>,
    );

    // Should not crash — no error boundary triggered
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Load Metrics')).toBeInTheDocument();
  });

  it('admin user with roles array loads global dashboard metrics', async () => {
    mockAuth.roles = ['ADMIN'];
    mockQuery.mockResolvedValueOnce({ data: { getDashboardMetrics: metricsData } });

    render(
      <TestWrapper initialEntries={['/dashboard']}>
        <DashboardPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByText('Load Metrics'));

    await waitFor(() => {
      expect(screen.getByTestId('metrics-grid')).toBeInTheDocument();
    });

    // Verify query was called with no studyId/siteId (global)
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        variables: { studyId: undefined, siteId: undefined },
      }),
    );
  });
});
