import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/components/Georgi', () => ({
  Georgi: () => <div data-testid="georgi" />,
}));

import { PointsView } from '../../src/components/PointsView';

const paths = [
  { id: 'p1', title: 'Path 1', earnedPoints: 40, totalPoints: 100 },
  { id: 'p2', title: 'Path 2', earnedPoints: 60, totalPoints: 60 },
];

describe('PointsView', () => {
  it('shows level and points summary', () => {
    render(<PointsView totalPoints={120} paths={paths} onBack={vi.fn()} />);
    expect(screen.getByText('Dein Level')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('Path 1')).toBeInTheDocument();
  });

  it('navigates to rewards when CTA clicked', async () => {
    const onNavigateToRewards = vi.fn();
    render(
      <PointsView
        totalPoints={120}
        paths={paths}
        onBack={vi.fn()}
        onNavigateToRewards={onNavigateToRewards}
      />
    );

    await userEvent.click(screen.getByRole('button', { name: /punkte einlösen|belohnungen ansehen/i }));
    expect(onNavigateToRewards).toHaveBeenCalled();
  });
});
