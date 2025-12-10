import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QRScanner } from '../../src/components/QRScanner';

const paths = [
  {
    id: 'historic',
    title: 'Historic Walk',
    stations: [
      { id: 1, title: 'Start' },
      { id: 2, title: 'Museum' },
    ],
  },
];

describe('QRScanner', () => {
  test('shows error for invalid manual code format', async () => {
    const user = userEvent.setup();
    render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} paths={paths} />);

    await user.type(screen.getByPlaceholderText(/z\.b\. historic-1/i), 'invalid');
    await user.click(screen.getByRole('button', { name: /öffnen/i }));

    expect(screen.getByText(/ungültiges format/i)).toBeInTheDocument();
  });

  test('calls onScan after valid manual entry', async () => {
    const user = userEvent.setup();
    const onScan = vi.fn();
    render(<QRScanner onClose={vi.fn()} onScan={onScan} paths={paths} />);

    await user.type(screen.getByPlaceholderText(/z\.b\. historic-1/i), 'historic-2');
    await user.click(screen.getByRole('button', { name: /öffnen/i }));

    expect(await screen.findByText(/station gefunden/i)).toBeInTheDocument();

    await vi.waitFor(() => {
      expect(onScan).toHaveBeenCalledWith('historic', 2);
    });
  });

  test('closes when X button clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<QRScanner onClose={onClose} onScan={vi.fn()} paths={paths} />);

    const closeButtons = screen.getAllByRole('button');
    await user.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows error for invalid path', async () => {
    const user = userEvent.setup();
    render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} paths={paths} />);

    await user.type(screen.getByPlaceholderText(/z\.b\. historic-1/i), 'invalid-1');
    await user.click(screen.getByRole('button', { name: /öffnen/i }));

    expect(screen.getByText(/pfad "invalid" wurde nicht gefunden/i)).toBeInTheDocument();
  });

  test('shows error for invalid station in valid path', async () => {
    const user = userEvent.setup();
    render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} paths={paths} />);

    await user.type(screen.getByPlaceholderText(/z\.b\. historic-1/i), 'historic-99');
    await user.click(screen.getByRole('button', { name: /öffnen/i }));

    expect(screen.getByText(/station 99 wurde.*nicht gefunden/i)).toBeInTheDocument();
  });

  test('shows error for non-numeric station id', async () => {
    const user = userEvent.setup();
    render(<QRScanner onClose={vi.fn()} onScan={vi.fn()} paths={paths} />);

    await user.type(screen.getByPlaceholderText(/z\.b\. historic-1/i), 'historic-abc');
    await user.click(screen.getByRole('button', { name: /öffnen/i }));

    expect(screen.getByText(/stations-id muss eine zahl sein/i)).toBeInTheDocument();
  });
});
