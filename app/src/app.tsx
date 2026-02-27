import Router from 'preact-router';
import { Header } from '@component/Header';
import { Home } from '@route/Home';
import { About } from '@route/About';
import { NotFound } from '@route/NotFound';

export function App() {
  return (
    <div>
      <Header />
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
