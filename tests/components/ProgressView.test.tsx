import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/components/Georgi', () => ({
  Georgi: () => <div data-testid="georgi" />,
  GeorgiAvatar: () => <div data-testid="georgi" />,
}));

vi.mock('../../src/components/ui/progress', () => ({
  Progress: (props: any) => <div data-testid="progress" {...props} />,
}));

import { ProgressView } from '../../src/components/ProgressView';

const paths = [
  {
    id: 'p1',
    title: 'Pfad 1',
    totalStations: 4,
    completedStations: 2,
    totalPoints: 100,
    earnedPoints: 40,
    difficulty: 'Einfach' as const,
    estimatedTime: '20m',
  },
  {
    id: 'p2',
    title: 'Pfad 2',
    totalStations: 2,
    completedStations: 2,
    totalPoints: 50,
    earnedPoints: 50,
    difficulty: 'Mittel' as const,
    estimatedTime: '10m',
  },
];

describe('ProgressView', () => {
  it('shows overall progress and path breakdown', () => {
    render(<ProgressView paths={paths} totalPoints={90} totalCompletedStations={3} onBack={vi.fn()} onPathSelect={vi.fn()} />);

    expect(screen.getByText(/Gesamtfortschritt/i)).toBeInTheDocument();
    expect(screen.getByText('Pfad 1')).toBeInTheDocument();
    expect(screen.getByText('Pfad 2')).toBeInTheDocument();
  });

  it('opens the clicked path', async () => {
    const onPathSelect = vi.fn();
    render(<ProgressView paths={paths} totalPoints={90} totalCompletedStations={3} onBack={vi.fn()} onPathSelect={onPathSelect} />);

    await userEvent.click(screen.getByRole('button', { name: /pfad 1/i }));
    expect(onPathSelect).toHaveBeenCalledWith('p1');
  });
});
