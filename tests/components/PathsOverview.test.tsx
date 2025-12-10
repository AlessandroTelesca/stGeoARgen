import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../../src/components/Georgi', () => ({
  Georgi: () => <div data-testid="georgi" />,
}));

vi.mock('../../src/components/figma/ImageWithFallback', () => ({
  ImageWithFallback: (props: any) => <img alt={props.alt} data-testid="image" />,
}));

import { PathsOverview } from '../../src/components/PathsOverview';

const paths = [
  {
    id: 'p1',
    title: 'Pfad 1',
    description: 'Desc 1',
    imageUrl: 'img1',
    totalStations: 4,
    completedStations: 2,
    totalPoints: 100,
    earnedPoints: 40,
    estimatedTime: '20m',
    difficulty: 'Einfach' as const,
  },
];

describe('PathsOverview', () => {
  it('renders stats and paths list', () => {
    render(<PathsOverview paths={paths} onPathSelect={vi.fn()} />);

    expect(screen.getByText('Alle Pfade')).toBeInTheDocument();
    expect(screen.getByText('Pfad 1')).toBeInTheDocument();
    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  it('fires onPathSelect on CTA click', async () => {
    const onPathSelect = vi.fn();
    render(<PathsOverview paths={paths} onPathSelect={onPathSelect} />);

    const cta = screen.getAllByRole('button').find(btn => /starten|weiter/i.test(btn.textContent || ''));
    expect(cta).toBeDefined();
    await userEvent.click(cta!);
    expect(onPathSelect).toHaveBeenCalledWith('p1');
  });
});
