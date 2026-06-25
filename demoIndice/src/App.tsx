import { Navigate, Route, Routes } from 'react-router-dom';
import { CompanyRoutePage } from './pages/CompanyRoutePage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RegisterPage } from './pages/RegisterPage';
import { RedirectWhenAuthenticated, RequireSession } from './routes/RouteGuards';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route element={<RedirectWhenAuthenticated />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/company-route" element={<CompanyRoutePage />} />
      <Route element={<RequireSession />}>
        <Route path="/home" element={<Navigate to="/home-panel/profile" replace />} />
        <Route path="/:pageId/*" element={<HomePage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
