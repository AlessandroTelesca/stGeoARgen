/// <reference types="vitest" />
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from '../../../src/components/ui/card';
import { Input } from '../../../src/components/ui/input';

describe('Card components', () => {
  it('renders card slots with data attributes', () => {
    const { container } = render(
      <Card className="custom-card">
        <CardHeader className="custom-header">
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>
    );

    const card = container.querySelector('[data-slot="card"]');
    const header = container.querySelector('[data-slot="card-header"]');
    const title = container.querySelector('[data-slot="card-title"]');
    const description = container.querySelector('[data-slot="card-description"]');
    const action = container.querySelector('[data-slot="card-action"]');
    const content = container.querySelector('[data-slot="card-content"]');
    const footer = container.querySelector('[data-slot="card-footer"]');

    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('custom-card');
    expect(header).toBeInTheDocument();
    expect(header).toHaveClass('custom-header');
    expect(title).toBeInTheDocument();
    expect(description).toBeInTheDocument();
    expect(action).toBeInTheDocument();
    expect(content).toBeInTheDocument();
    expect(footer).toBeInTheDocument();
  });
});

describe('Input', () => {
  it('renders input with merged classes and attributes', () => {
    const { container } = render(
      <Input type="email" placeholder="Email" className="custom-input" />
    );

    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Email');
    expect(input).toHaveAttribute('data-slot', 'input');
    expect(input).toHaveClass('custom-input');
  });
});
