import Router, { route } from 'preact-router';
import { useEffect } from 'preact/hooks';
import { Header } from '@component/Header';
import { Home } from '@route/Home';
import { About } from '@route/About';
import { Login } from '@route/Login';
import { NotFound } from '@route/NotFound';
import { AuthProvider, useAuth } from './lib/auth';

function AuthGuard() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      route("/login");
    }
  }, [user, loading]);

  return null;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div class="min-h-screen flex items-center justify-center">
        <p class="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Unauthenticated: only show login
  if (!user) {
    return (
      <Router>
        <Login path="/login" />
        <Login default />
      </Router>
    );
  }

  // Authenticated: show full app
  return (
    <div class="max-w-5xl mx-auto px-8 py-4 font-sans text-gray-800 bg-white min-h-screen">
      <Header />
      <AuthGuard />
      <main>
        <Router>
          <Home path="/" />
          <About path="/about" />
          <NotFound default />
        </Router>
      </main>
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
