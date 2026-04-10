import { useEffect, useState } from 'react';

type HealthStatus = {
  status: string;
  timestamp: string;
};

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/health')
      .then((res) => res.json())
      .then((data: HealthStatus) => setHealth(data))
      .catch(() => setError('Could not reach server'));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>SolutionDesk</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {health && (
        <p>
          Server status: <strong>{health.status}</strong> — {health.timestamp}
        </p>
      )}
      {!health && !error && <p>Checking server...</p>}
    </div>
  );
}

export default App;
