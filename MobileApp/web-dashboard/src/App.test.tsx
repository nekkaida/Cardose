import React from 'react';
import { render } from '@testing-library/react';

// Mock react-router-dom to avoid ESM import issues
jest.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: any) => <div>{children}</div>,
  Routes: ({ children }: any) => <div>{children}</div>,
  Route: () => null,
  Navigate: () => null,
  Link: ({ children }: any) => <a>{children}</a>,
  useLocation: () => ({ pathname: '/' }),
  useNavigate: () => jest.fn(),
}));

// Mock axios to prevent network calls
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
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
