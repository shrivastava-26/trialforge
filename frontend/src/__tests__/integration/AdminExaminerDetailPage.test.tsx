import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { SnackbarProvider } from 'notistack';
import { AdminExaminerDetailPage } from '../../pages/admin/ExaminerDetailPage';
import { GET_EXAMINER_QUERY } from '../../services/examinerService';
import { ADD_EXAMINER_CERTIFICATE_MUTATION } from '../../services/adminService';

// Mock AdminLayout to avoid sidebar/header complexity
vi.mock('../../components/admin/AdminLayout', () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const EXAMINER_ID = '42';

const examinerData = {
  getExaminer: {
    id: EXAMINER_ID,
    examinerCode: 'EX-042',
    name: 'Jane Doe',
    specialty: 'Cardiology',
    email: 'jane@test.com',
    role: 'Principal Investigator',
    status: 'Active',
    studies: [],
    sites: [],
    certificates: [],
  },
};

const examinerWithCertData = {
  getExaminer: {
    ...examinerData.getExaminer,
    certificates: [{ id: '1', certificateId: 'GCP-001', expiresOn: '2099-01-01' }],
  },
};

function makeGetExaminerMock(data = examinerData) {
  return {
    request: { query: GET_EXAMINER_QUERY, variables: { id: EXAMINER_ID } },
    result: { data },
  };
}

function makeAddCertMock(success = true) {
  return {
    request: {
      query: ADD_EXAMINER_CERTIFICATE_MUTATION,
      variables: { examinerId: EXAMINER_ID, input: { certificateId: 'GCP-NEW', expiresOn: '2099-12-31' } },
    },
    result: success
      ? { data: { addExaminerCertificate: { id: '99', certificateId: 'GCP-NEW', expiresOn: '2099-12-31' } } }
      : { errors: [{ message: 'Certificate already exists', extensions: { code: 'BAD_USER_INPUT', fieldErrors: { certificateId: 'Already exists' } } }] },
  };
}

function renderPage(mocks: object[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={[`/admin/examiners/${EXAMINER_ID}`]}>
          <Routes>
            <Route path="/admin/examiners/:id" element={<AdminExaminerDetailPage />} />
            <Route path="/admin/examiners/:id/history" element={<div>History Page</div>} />
          </Routes>
        </MemoryRouter>
      </SnackbarProvider>
    </MockedProvider>
  );
}

describe('AdminExaminerDetailPage', () => {
  it('renders examiner details after loading', async () => {
    renderPage([makeGetExaminerMock()]);
    await waitFor(() => expect(screen.getByText('Jane Doe')).toBeInTheDocument());
    // EX-042 appears in both the badge and the Code field — use getAllByText
    expect(screen.getAllByText('EX-042').length).toBeGreaterThan(0);
    expect(screen.getByText('Cardiology')).toBeInTheDocument();
  });

  it('shows "No certificates on file" when certificates array is empty', async () => {
    renderPage([makeGetExaminerMock()]);
    await waitFor(() => expect(screen.getByText(/no certificates on file/i)).toBeInTheDocument());
  });

  it('shows certificate row when examiner has certificates', async () => {
    renderPage([makeGetExaminerMock(examinerWithCertData)]);
    await waitFor(() => expect(screen.getByText('GCP-001')).toBeInTheDocument());
    expect(screen.getByText('Valid')).toBeInTheDocument();
  });

  it('opens Add Certificate dialog on button click', async () => {
    renderPage([makeGetExaminerMock()]);
    await waitFor(() => screen.getByText('Jane Doe'));
    await userEvent.click(screen.getByRole('button', { name: /add certificate/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/certificate id/i)).toBeInTheDocument();
  });

  it('submits add certificate mutation and shows success toast', async () => {
    const refetchMock = makeGetExaminerMock(examinerWithCertData);
    renderPage([makeGetExaminerMock(), makeAddCertMock(true), refetchMock]);
    await waitFor(() => screen.getByText('Jane Doe'));

    await userEvent.click(screen.getByRole('button', { name: /add certificate/i }));
    await userEvent.type(screen.getByLabelText(/certificate id/i), 'GCP-NEW');
    await userEvent.type(screen.getByLabelText(/expires on/i), '2099-12-31');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(screen.getByText(/certificate added/i)).toBeInTheDocument());
  });

  it('shows field error toast on BAD_USER_INPUT from add certificate', async () => {
    renderPage([makeGetExaminerMock(), makeAddCertMock(false)]);
    await waitFor(() => screen.getByText('Jane Doe'));

    await userEvent.click(screen.getByRole('button', { name: /add certificate/i }));
    await userEvent.type(screen.getByLabelText(/certificate id/i), 'GCP-NEW');
    await userEvent.type(screen.getByLabelText(/expires on/i), '2099-12-31');
    await userEvent.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() => expect(screen.getByText(/please correct/i)).toBeInTheDocument());
  });
});
