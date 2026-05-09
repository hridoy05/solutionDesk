import { screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import { renderWithProviders } from '../test/utils';
import UsersPage from './UsersPage';
import { Role } from '../lib/constants';

vi.mock('axios');
const mockedAxios = vi.mocked(axios, true);

const MOCK_USERS = [
  {
    id: '1',
    name: 'Alice Admin',
    email: 'alice@example.com',
    role: Role.admin,
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: '2',
    name: 'Bob Agent',
    email: 'bob@example.com',
    role: Role.agent,
    createdAt: '2024-03-20T08:30:00.000Z',
  },
];

const renderPage = () => renderWithProviders(<UsersPage />);

describe('UsersPage', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows skeleton rows while loading', () => {
    mockedAxios.get.mockReturnValue(new Promise(() => {})); // never resolves
    renderPage();
    // 5 skeleton rows × 4 cells = 20 skeleton elements
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBe(20);
  });

  it('renders user rows after data loads', async () => {
    mockedAxios.get.mockResolvedValue({ data: MOCK_USERS });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Alice Admin')).toBeInTheDocument();
    });

    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Agent')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('shows correct role badges', async () => {
    mockedAxios.get.mockResolvedValue({ data: MOCK_USERS });
    renderPage();

    await waitFor(() => screen.getByText('Alice Admin'));

    const adminBadge = screen.getByText(Role.admin);
    const agentBadge = screen.getByText(Role.agent);

    expect(adminBadge).toHaveClass('bg-purple-100', 'text-purple-800');
    expect(agentBadge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('shows error message when request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Failed to load users.')).toBeInTheDocument();
    });
  });

  it('shows empty state when no users returned', async () => {
    mockedAxios.get.mockResolvedValue({ data: [] });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });
  });

  it('calls the correct API endpoint with credentials', async () => {
    mockedAxios.get.mockResolvedValue({ data: MOCK_USERS });
    renderPage();

    await waitFor(() => screen.getByText('Alice Admin'));

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/users', { withCredentials: true });
  });

  it('formats the joined date as a locale date string', async () => {
    mockedAxios.get.mockResolvedValue({ data: [MOCK_USERS[0]] });
    renderPage();

    await waitFor(() => screen.getByText('Alice Admin'));

    const expected = new Date('2024-01-15T10:00:00.000Z').toLocaleDateString();
    expect(screen.getByText(expected)).toBeInTheDocument();
  });
});
