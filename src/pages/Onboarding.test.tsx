import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: vi.fn() } }));

import Onboarding from './Onboarding';

const renderPage = () =>
  render(
    <MemoryRouter>
      <Onboarding />
    </MemoryRouter>,
  );

describe('Onboarding', () => {
  it('shows the week once 3–6 days are picked, and follows the focus scores', () => {
    renderPage();
    expect(screen.queryByText('Your week')).toBeNull();

    for (const day of ['Mon', 'Tue', 'Thu', 'Sat']) fireEvent.click(screen.getByRole('button', { name: day }));
    expect(screen.getByText('Your week')).toBeInTheDocument();

    // Balanced 3/3/3 on 4 days: A and B always in, plus zone 2 (no intervals before the test).
    expect(screen.getByText('Push')).toBeInTheDocument();
    expect(screen.getByText('Pull')).toBeInTheDocument();
    expect(screen.getAllByText('Zone 2').length).toBeGreaterThan(0);

    // Strength to 5: three strength sessions switch to the U1 · U2 · L split.
    fireEvent.click(screen.getByRole('button', { name: 'Strength 5 of 5' }));
    expect(screen.getByText('Upper push')).toBeInTheDocument();
    expect(screen.getByText('Lower')).toBeInTheDocument();
  });

  it('asks for the gym and the health questions before saving', () => {
    renderPage();
    for (const day of ['Mon', 'Wed', 'Fri']) fireEvent.click(screen.getByRole('button', { name: day }));
    fireEvent.click(screen.getByRole('button', { name: /start training/i }));
    expect(screen.getByText('Please answer all questions.')).toBeInTheDocument();
  });
});
