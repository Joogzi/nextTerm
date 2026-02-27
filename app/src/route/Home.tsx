import { useState, useEffect } from 'preact/hooks';
import { apiFetch } from '@lib/api';

export function Home(_props: { path?: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ message: string }>('/hello')
      .then(data => setMessage(data.message))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div>
      <h1 class="text-3xl font-bold mb-4">Home</h1>
      <p class="leading-relaxed text-gray-600 mb-4">Welcome to the application.</p>
      <div class="p-4 rounded-lg bg-gray-50 border border-gray-200">
        <p class="text-sm font-medium text-gray-500 mb-1">API Response:</p>
        {error ? (
          <p class="text-red-600">{error}</p>
        ) : message ? (
          <p class="text-green-700 font-semibold">{message}</p>
        ) : (
          <p class="text-gray-400">Loading...</p>
        )}
      </div>
    </div>
  );
}
