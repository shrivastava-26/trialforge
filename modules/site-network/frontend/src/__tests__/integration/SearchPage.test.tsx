import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { MemoryRouter } from 'react-router-dom';
import { SearchPage } from '../../pages/shared/SearchPage';
import { GLOBAL_SEARCH_QUERY } from '../../services/searchService';
import { ReactNode } from 'react';

function layout(children: ReactNode) { return <>{children}</>; }

const SEARCH_MOCK = {
  request: {
    query: GLOBAL_SEARCH_QUERY,
    variables: { keyword: 'alpha', filters: undefined },
  },
  result: {
    data: {
      globalSearch: {
        studies: [{ id: '1', protocolId: 'P-001', title: 'Alpha Trial', sponsor: 'Pharma', phase: 'Phase I', status: 'Planned' }],
        sites: [],
        examiners: [],
      },
    },
  },
};

const EMPTY_MOCK = {
  request: {
    query: GLOBAL_SEARCH_QUERY,
    variables: { keyword: 'zzznomatch', filters: undefined },
  },
  result: {
    data: {
      globalSearch: { studies: [], sites: [], examiners: [] },
    },
  },
};

function renderSearchPage(mocks = [SEARCH_MOCK]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter>
        <SearchPage layout={layout} baseRoute="/admin" />
      </MemoryRouter>
    </MockedProvider>
  );
}

describe('SearchPage', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders idle state with search icon when no keyword entered', () => {
    renderSearchPage();
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
    expect(screen.getByText(/type a keyword/i)).toBeInTheDocument();
  });

  it('shows "type at least 2 characters" hint for single-char input', () => {
    renderSearchPage();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'a' } });
    expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
  });

  it('does not fire query before debounce delay', () => {
    renderSearchPage();
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'alpha' } });
    act(() => { vi.advanceTimersByTime(200); });
    expect(screen.queryByText('Alpha Trial')).not.toBeInTheDocument();
  });

  it('fires query after debounce and renders study results', async () => {
    renderSearchPage([SEARCH_MOCK]);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'alpha' } });
    await act(async () => { vi.advanceTimersByTime(500); });
    await waitFor(() => expect(screen.getByText('Alpha Trial')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText(/P-001/)).toBeInTheDocument();
  });

  it('shows "no results" alert when search returns empty', async () => {
    renderSearchPage([EMPTY_MOCK]);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'zzznomatch' } });
    await act(async () => { vi.advanceTimersByTime(500); });
    await waitFor(() => expect(screen.getAllByText(/no results/i).length).toBeGreaterThan(0), { timeout: 3000 });
  });

  it('shows result count summary line', async () => {
    renderSearchPage([SEARCH_MOCK]);
    fireEvent.change(screen.getByPlaceholderText(/search/i), { target: { value: 'alpha' } });
    await act(async () => { vi.advanceTimersByTime(500); });
    await waitFor(() => expect(screen.getByText(/1 result/i)).toBeInTheDocument(), { timeout: 3000 });
  });
});
