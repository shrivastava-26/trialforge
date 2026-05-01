import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { AdminStudyDetailPage } from '../pages/admin/StudyDetailPage';
import { GET_STUDY_QUERY, GET_SITES_PICKER_QUERY } from '../services/studyService';
import { ASSIGN_EXAMINER_TO_STUDY_SITE, UNASSIGN_EXAMINER_FROM_STUDY_SITE } from '../services/adminService';

vi.mock('../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const STUDY_ID = '10';
const SITE_ID = '20';
const EXAMINER_ID = '30';
const CERT_ID = '40';

const studyWithSSE = {
  getStudy: {
    id: STUDY_ID,
    protocolId: 'P-SSE',
    title: 'SSE Study',
    sponsor: 'Sponsor',
    phase: 'Phase I',
    startDate: '2025-01-01',
    endDate: '',
    status: 'Active',
    description: '',
    sites: [{ id: SITE_ID, siteCode: 'SC-01', name: 'Main Site', city: 'NYC', country: 'US', status: 'Active' }],
    examiners: [],
    studySites: [
      {
        site: { id: SITE_ID, siteCode: 'SC-01', name: 'Main Site', city: 'NYC', country: 'US', status: 'Active' },
        examiners: [],
        availableExaminers: [
          {
            id: EXAMINER_ID,
            examinerCode: 'EX-030',
            name: 'Dr. Smith',
            specialty: 'Cardiology',
            role: 'Principal Investigator',
            status: 'Active',
            certificates: [{ id: CERT_ID, certificateId: 'GCP-VALID', expiresOn: '2099-01-01' }],
          },
        ],
      },
    ],
  },
};

const studyWithAssignedExaminer = {
  getStudy: {
    ...studyWithSSE.getStudy,
    studySites: [
      {
        ...studyWithSSE.getStudy.studySites[0],
        examiners: [
          {
            id: EXAMINER_ID,
            examinerCode: 'EX-030',
            name: 'Dr. Smith',
            specialty: 'Cardiology',
            role: 'Principal Investigator',
            status: 'Active',
            certificate: { id: CERT_ID, certificateId: 'GCP-VALID', expiresOn: '2099-01-01' },
          },
        ],
      },
    ],
  },
};

function makeStudyMock(data = studyWithSSE) {
  return {
    request: { query: GET_STUDY_QUERY, variables: { id: STUDY_ID } },
    result: { data },
  };
}

const assignMock = {
  request: {
    query: ASSIGN_EXAMINER_TO_STUDY_SITE,
    variables: { studyId: STUDY_ID, siteId: SITE_ID, examinerId: EXAMINER_ID, certificateId: CERT_ID },
  },
  result: { data: { assignExaminerToStudySite: true } },
};

const unassignMock = {
  request: {
    query: UNASSIGN_EXAMINER_FROM_STUDY_SITE,
    variables: { studyId: STUDY_ID, siteId: SITE_ID, examinerId: EXAMINER_ID },
  },
  result: { data: { unassignExaminerFromStudySite: true } },
};

const sitesPickerMock = {
  request: { query: GET_SITES_PICKER_QUERY, variables: {} },
  result: { data: { getSites: { rows: [] } } },
};

function renderPage(mocks: object[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[`/admin/studies/${STUDY_ID}`]}>
          <Routes>
            <Route path="/admin/studies/:id" element={<AdminStudyDetailPage />} />
            <Route path="/admin/studies/:id/history" element={<div>History</div>} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </MockedProvider>
  );
}

describe('AdminStudyDetailPage — StudySitePanel', () => {
  it('renders study title and site panel after loading', async () => {
    renderPage([makeStudyMock(), sitesPickerMock]);
    await waitFor(() => expect(screen.getByText('SSE Study')).toBeInTheDocument());
    // 'Main Site' appears in both the DataGrid row and the SSE panel header
    expect(screen.getAllByText('Main Site').length).toBeGreaterThan(0);
    expect(screen.getByText('Dr. Smith')).toBeInTheDocument();
  });

  it('shows examiner checkbox unchecked when not assigned', async () => {
    renderPage([makeStudyMock(), sitesPickerMock]);
    await waitFor(() => screen.getByText('Dr. Smith'));
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).not.toBeChecked();
  });

  it('opens CertificatePickerDialog when clicking unchecked examiner with valid certs', async () => {
    renderPage([makeStudyMock(), sitesPickerMock]);
    await waitFor(() => screen.getByText('Dr. Smith'));
    await userEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument());
    expect(screen.getByText(/select certificate/i)).toBeInTheDocument();
    expect(screen.getByText('GCP-VALID')).toBeInTheDocument();
  });

  it('fires assign mutation after selecting a certificate', async () => {
    renderPage([makeStudyMock(), sitesPickerMock, assignMock, makeStudyMock(studyWithAssignedExaminer)]);
    await waitFor(() => screen.getByText('Dr. Smith'));
    await userEvent.click(screen.getByRole('checkbox'));
    await waitFor(() => screen.getByText('GCP-VALID'));
    // Click the cert option in the picker
    await userEvent.click(screen.getByText('GCP-VALID'));
    await waitFor(() => expect(screen.getByText(/assigned to study/i)).toBeInTheDocument());
  });

  it('fires unassign mutation when clicking a checked examiner', async () => {
    renderPage([makeStudyMock(studyWithAssignedExaminer), sitesPickerMock, unassignMock, makeStudyMock()]);
    await waitFor(() => screen.getByText('Dr. Smith'));
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    await userEvent.click(checkbox);
    await waitFor(() => expect(screen.getByText(/unassigned/i)).toBeInTheDocument());
  });

  it('shows lock banner and disables checkboxes for Completed study', async () => {
    const completedStudy = {
      getStudy: {
        ...studyWithSSE.getStudy,
        status: 'Completed',
      },
    };
    renderPage([makeStudyMock(completedStudy), sitesPickerMock]);
    await waitFor(() => screen.getByText('SSE Study'));
    // 'Completed' appears in both the status chip and the lock banner
    expect(screen.getAllByText(/completed/i).length).toBeGreaterThan(0);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeDisabled();
  });
});
