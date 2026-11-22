import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/theme.css';
import './styles/pixel.css';
import { App } from './App';

// 依 Vite BASE_URL 動態綁定底圖路徑，確保部署在 GitHub Pages 子路徑（/<repo>/）不會 404
const baseUrl = import.meta.env.BASE_URL;
document.documentElement.style.setProperty('--cover-image', `url('${baseUrl}cover-1.jpg')`);
document.documentElement.style.setProperty(
  '--island-map-image',
  `url('${baseUrl}island-map-n.jpg')`,
);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('找不到 #root 掛載節點');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
