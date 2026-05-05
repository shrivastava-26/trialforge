import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ViewerStudyDetailPage } from '../../pages/viewer/StudyDetailPage';
import { GET_STUDY_QUERY } from '../../services/studyService';

vi.mock('../../components/shared/ViewerLayout', () => ({
  ViewerLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const STUDY_ID = '5';

const studyData = {
  getStudy: {
    id: STUDY_ID,
    protocolId: 'VW-001',
    title: 'Viewer Study',
    sponsor: 'ViewSponsor',
    phase: 'Phase II',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    status: 'Active',
    description: 'A read-only study',
    sites: [{ id: '10', siteCode: 'VS-01', name: 'View Site', city: 'Paris', country: 'France', status: 'Active' }],
    examiners: [],
    studySites: [
      {
        site: { id: '10', siteCode: 'VS-01', name: 'View Site', city: 'Paris', country: 'France', status: 'Active' },
        examiners: [
          {
            id: '20', examinerCode: 'VE-01', name: 'Dr. Viewer', specialty: 'Neurology',
            role: 'Principal Investigator', status: 'Active', email: 'v@t.com',
            certificate: { id: '1', certificateId: 'GCP-V1', expiresOn: '2099-01-01' },
          },
        ],
        availableExaminers: [],
      },
    ],
  },
};

const studyMock = {
  request: { query: GET_STUDY_QUERY, variables: { id: STUDY_ID } },
  result: { data: studyData },
};

function renderPage(mocks = [studyMock]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={[`/viewer/studies/${STUDY_ID}`]}>
        <Routes>
          <Route path="/viewer/studies/:id" element={<ViewerStudyDetailPage />} />
        </Routes>
      </MemoryRouter>
    </MockedProvider>
  );
}

describe('ViewerStudyDetailPage', () => {
  it('renders study details after loading', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Viewer Study')).toBeInTheDocument());
    expect(screen.getAllByText('VW-001').length).toBeGreaterThan(0);
    expect(screen.getByText('ViewSponsor')).toBeInTheDocument();
    expect(screen.getByText('Phase II')).toBeInTheDocument();
  });

  it('renders per-site examiner breakdown', async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText('Dr. Viewer')).toBeInTheDocument());
    expect(screen.getAllByText('View Site').length).toBeGreaterThan(0);
    expect(screen.getByText(/Examiners by Site/i)).toBeInTheDocument();
  });

  it('does not render any Create, Edit, or Assign buttons', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Viewer Study'));
    expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /assign/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument();
  });

  it('does not render checkboxes (no assignment controls)', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Viewer'));
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('shows certificate info inline for assigned examiner', async () => {
    renderPage();
    await waitFor(() => screen.getByText('Dr. Viewer'));
    expect(screen.getByText(/GCP-V1/)).toBeInTheDocument();
  });
});
