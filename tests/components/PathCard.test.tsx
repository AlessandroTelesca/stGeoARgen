import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PathCard } from '../../src/components/PathCard';

describe('PathCard', () => {
  const props = {
    id: 'path-1',
    title: 'City Trail',
    description: 'Explore the city',
    imageUrl: 'https://example.com/path.jpg',
    totalStations: 4,
    completedStations: 2,
    totalPoints: 200,
    earnedPoints: 80,
    estimatedTime: '30 min',
    difficulty: 'Einfach' as const,
    onClick: vi.fn(),
  };

  it('renders path summary', () => {
    render(<PathCard {...props} />);
    expect(screen.getByText('City Trail')).toBeInTheDocument();
    expect(screen.getByText('Explore the city')).toBeInTheDocument();
    expect(screen.getByText(/2\s*\/\s*4/)).toBeInTheDocument();
  });

  it('invokes onClick when selected', async () => {
    const onClick = vi.fn();
    render(<PathCard {...props} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
