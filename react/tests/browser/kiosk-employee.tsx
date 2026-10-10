import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router';
import { LanguageProvider } from '../../src/app/shared/context';
import MultiKioskMobilePage from '../../src/app/KioskCenter/MultiKioskMobilePage';
import '../../src/styles/index.css';
createRoot(document.getElementById('root')!).render(<StrictMode><LanguageProvider><MemoryRouter initialEntries={['/multi-kiosk/synthetic-link']}><Routes><Route path="/multi-kiosk/:publicAccessToken" element={<MultiKioskMobilePage />} /></Routes></MemoryRouter></LanguageProvider></StrictMode>);
