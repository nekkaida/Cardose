import React from 'react';
import { render } from '@testing-library/react';

// Mock react-router-dom to avoid ESM import issues
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: any) => <div>{children}</div>,
  Routes: ({ children }: any) => <div>{children}</div>,
  Route: () => null,
  Navigate: () => null,
  Link: ({ children }: any) => <a>{children}</a>,
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => vi.fn(),
}));

// Mock axios to prevent network calls
vi.mock('axios', () => ({
  __esModule: true,
  default: {
    get: vi.fn(),
    post: vi.fn(),
    create: vi.fn(() => ({
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
    defaults: { headers: { common: {} } },
  },
}));

import App from './App';

test('renders without crashing', () => {
  const { container } = render(<App />);
  expect(container).toBeTruthy();
});
