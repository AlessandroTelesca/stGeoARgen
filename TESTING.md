# Testing Guide for stGeoARgen

## Overview

This project uses **Vitest** as the testing framework with **React Testing Library** for component testing. All tests are configured to run in a jsdom environment with comprehensive setup utilities.

## Test Infrastructure

### Configured Tools

- **Test Runner**: Vitest v4.0.14
- **Component Testing**: React Testing Library v16.3.0
- **Environment**: jsdom (browser-like environment for Node.js)
- **Coverage**: Vitest Coverage v8
- **UI**: Vitest UI for visual test exploration

### Configuration Files

- **vitest.config.ts** - Main Vitest configuration
- **src/test/setup.ts** - Test environment setup and global mocks

## Running Tests

### Run all tests (single pass)
```bash
npm test -- --run
```

### Run tests in watch mode
```bash
npm test
```

### Run tests with UI dashboard
```bash
npm test:ui
```

### Generate coverage report
```bash
npm test:coverage -- --run
```

## Test Structure

### Test Files Created

1. **Component Tests**
   - `src/components/Header.test.tsx` - Header component tests
   - `src/components/Dashboard.test.tsx` - Dashboard component tests
   - `src/components/Settings.test.tsx` - Settings component tests
   - `src/components/ProgressBar.test.tsx` - ProgressBar component tests
   - `src/components/StationCard.test.tsx` - StationCard component data tests
   - `src/components/PathCard.test.tsx` - PathCard component data tests

2. **Utility Tests**
   - `src/components/ui/utils.test.ts` - Class merging utility (cn) tests
   - `src/test/basic.test.ts` - Basic JavaScript operations tests

### Current Test Coverage

**25 passing tests** across 8 test files:
- 6 component test files
- 2 utility test files

## Writing New Tests

### Basic Component Test Example

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders the component', () => {
    render(<MyComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interactions', async () => {
    const mockFn = vi.fn();
    render(<MyComponent onClick={mockFn} />);
    
    const button = screen.getByRole('button');
    await userEvent.click(button);
    
    expect(mockFn).toHaveBeenCalled();
  });
});
```

### Utility Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { myUtil } from './myUtil';

describe('myUtil', () => {
  it('performs expected transformation', () => {
    const result = myUtil('input');
    expect(result).toBe('expected output');
  });
});
```

## Best Practices

### 1. **Test Organization**
- Keep test files colocated with source files
- Use `.test.tsx` or `.test.ts` suffix
- Group related tests with `describe` blocks

### 2. **Mocking**
- Use `vi.fn()` for mocking functions
- Mock external dependencies appropriately
- Avoid testing implementation details

### 3. **Assertions**
- Use clear, descriptive test names
- Test behavior, not implementation
- Aim for high-level assertions

### 4. **Component Testing**
- Test user interactions and outcomes
- Verify accessibility (ARIA roles, labels)
- Use semantic queries (getByRole, getByLabelText)

### 5. **Code Coverage**
- Aim for meaningful coverage (not just percentage)
- Focus on critical paths and user workflows
- Test edge cases and error states

## Setup Utilities

The test setup file (`src/test/setup.ts`) provides:

- **Jest DOM matchers** - Enhanced assertions for DOM elements
- **window.matchMedia mock** - Mocks CSS media queries for responsive components
- **Automatic cleanup** - Cleans up React DOM after each test

## Debugging Tests

### Debug Mode
```bash
npm test -- --reporter=verbose
```

### Inspect HTML in Tests
```typescript
import { render, screen } from '@testing-library/react';

const { debug } = render(<MyComponent />);
debug(); // Prints DOM to console
```

### Check Element Queries
```typescript
const { container } = render(<MyComponent />);
console.log(container.innerHTML);
```

## Common Test Patterns

### Testing Props
```typescript
it('accepts and uses props', () => {
  const mockProps = { name: 'Test' };
  render(<MyComponent {...mockProps} />);
  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

### Testing Events
```typescript
import userEvent from '@testing-library/user-event';

it('calls onClick handler', async () => {
  const onClick = vi.fn();
  render(<button onClick={onClick}>Click me</button>);
  
  await userEvent.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalled();
});
```

### Testing Async Operations
```typescript
it('handles async operations', async () => {
  render(<AsyncComponent />);
  
  const element = await screen.findByText('Loaded', {}, { timeout: 3000 });
  expect(element).toBeInTheDocument();
});
```

## Next Steps

To expand test coverage:

1. **Add tests for AR components** - Test ARVisualizer.ts and AR component logic
2. **Add integration tests** - Test component interactions and data flow
3. **Add snapshot tests** - For stable component rendering
4. **Add E2E tests** - Consider Playwright or Cypress for user workflows
5. **Increase coverage** - Aim for >80% coverage on critical paths

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library Docs](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Troubleshooting

### Tests Not Finding Components
Ensure components are properly exported as named or default exports

### jsdom Errors
Check that window APIs are properly mocked in setup.ts

### Flaky Tests
Add proper wait conditions using `findBy` queries instead of `getBy`

### Memory Leaks
Ensure cleanup runs after each test (already configured in setup.ts)
