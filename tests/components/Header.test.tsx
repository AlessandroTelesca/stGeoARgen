import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../../src/components/Header';

const baseProps = {
  title: 'Test App',
  onNavigate: vi.fn(),
  currentView: 'home',
};

describe('Header', () => {
  it('renders title and menu button', () => {
    render(<Header username={null} onLogin={function (): void {
      throw new Error('Function not implemented.');
    } } onLogout={function (): void {
      throw new Error('Function not implemented.');
    } } {...baseProps} />);
    expect(screen.getByText('Test App')).toBeInTheDocument();
    expect(screen.getByLabelText('Menü')).toBeInTheDocument();
  });

  it('opens menu and navigates', async () => {
    const onNavigate = vi.fn();
    render(<Header username={null} onLogin={function (): void {
      throw new Error('Function not implemented.');
    } } onLogout={function (): void {
      throw new Error('Function not implemented.');
    } } {...baseProps} onNavigate={onNavigate} />);

    const menuButton = screen.getByLabelText('Menü');
    await userEvent.click(menuButton);

    const startItem = await screen.findByText('Startseite');
    await userEvent.click(startItem);

    expect(onNavigate).toHaveBeenCalledWith('home');
  });
});
