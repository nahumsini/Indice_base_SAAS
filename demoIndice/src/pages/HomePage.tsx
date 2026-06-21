import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../../../react/src/app/components/Header';
import PanelInicial from '../../../react/src/app/BasicModules/Dashboard';

export function HomePage() {
  const navigate = useNavigate();
  const [learningModeActive, setLearningModeActive] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const handleNavigate = (page?: string) => {
    if (!page || page === 'dashboard' || page === 'home-panel') {
      navigate('/home-panel/profile');
      return;
    }

    navigate(`/${page}`);
  };

  return (
    <div
      translate="no"
      className={`notranslate min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}
    >
      <Header
        learningModeActive={learningModeActive}
        onToggleLearningMode={() => setLearningModeActive((current) => !current)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
      />
      <PanelInicial
        learningModeActive={learningModeActive}
        onNavigate={handleNavigate}
      />
    </div>
  );
}
