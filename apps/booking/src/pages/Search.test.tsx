import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BookingFlowProvider } from '../context/BookingFlowContext';
import { Search } from './Search';

function renderSearch() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <BookingFlowProvider>
          <Search />
        </BookingFlowProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('Search page', () => {
  it('renders the search form with date and occupancy fields', () => {
    renderSearch();
    expect(screen.getByText('Find a room')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Check-in/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByLabelText(/Check-out/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByLabelText(/Adults/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search availability/i })).toBeInTheDocument();
  });
});
