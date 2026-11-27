import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/integrations/supabase/client', () => {
  const chain = { select: () => chain, order: () => Promise.resolve({ data: [], error: null }) };
  return { supabase: { from: () => chain } };
});

import FeedLibrary from './FeedLibrary';

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FeedLibrary />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('Feed · exercise library', () => {
  it('fills the standard dose from the tags until Robbe types his own', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Add an exercise' })).toBeInTheDocument();
    const dose = screen.getByLabelText('Default') as HTMLInputElement;
    expect(dose.value).toBe('3 × 6–8');

    fireEvent.click(screen.getByRole('button', { name: 'Power' }));
    expect(dose.value).toBe('3 × 3–5');

    fireEvent.change(dose, { target: { value: '4 × 3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mobility' }));
    expect(dose.value).toBe('4 × 3');
  });

  it('only asks for a pattern on main strength lifts, and shows the member preview', () => {
    renderPage();
    expect(screen.getByRole('button', { name: 'Squat' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Accessory' }));
    expect(screen.queryByRole('button', { name: 'Squat' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Split squat' } });
    expect(screen.getByText('Split squat')).toBeInTheDocument();
    expect(screen.getByText(/Lower body strength · accessory/)).toBeInTheDocument();
  });
});
