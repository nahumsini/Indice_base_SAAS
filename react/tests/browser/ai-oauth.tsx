import { createRoot } from 'react-dom/client';
import { MemoryRouter, Routes, Route } from 'react-router';
import AiOAuthAuthorizePage from '../../src/app/Auth/AiOAuthAuthorizePage';
import '../../src/styles/index.css';

createRoot(document.getElementById('root')!).render(
  <MemoryRouter initialEntries={['/oauth/authorize' + window.location.search]}>
    <Routes>
      <Route path="/oauth/authorize" element={<AiOAuthAuthorizePage />} />
      <Route path="/login" element={<h1>Ingresar de nuevo</h1>} />
    </Routes>
  </MemoryRouter>,
);
