import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StationCard } from '../../src/components/StationCard';

describe('StationCard', () => {
  const props = {
    id: 1,
    title: 'Station 1',
    description: 'A nice station',
    imageUrl: 'https://example.com/station.jpg',
    status: 'available' as const,
    points: 25,
    onClick: vi.fn(),
  };

  it('renders station content', () => {
    render(<StationCard {...props} />);
    expect(screen.getByText('Station 1')).toBeInTheDocument();
    expect(screen.getByText('A nice station')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();
  });

  it('fires click handler', async () => {
    const onClick = vi.fn();
    render(<StationCard {...props} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
