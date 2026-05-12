import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../../components/shared/ErrorBoundary';

// Suppress console.error noise from intentional throws in tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div>Normal Content</div>;
}

describe('ErrorBoundary', () => {
  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });

  it('renders fallback UI when child throws', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test render error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('logs the error to console.error', () => {
    render(
      <ErrorBoundary>
        <ThrowingChild shouldThrow={true} />
      </ErrorBoundary>
    );
    expect(console.error).toHaveBeenCalled();
  });

  it('resets error state when Try again is clicked', () => {
    // Use a wrapper that controls whether the child throws
    let setShouldThrow: (v: boolean) => void;

    function Wrapper() {
      const [shouldThrow, setThrow] = React.useState(true);
      setShouldThrow = setThrow;
      return (
        <ErrorBoundary>
          <ThrowingChild shouldThrow={shouldThrow} />
        </ErrorBoundary>
      );
    }

    render(<Wrapper />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Stop the child from throwing, then reset the boundary
    setShouldThrow!(false);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Normal Content')).toBeInTheDocument();
  });
});
