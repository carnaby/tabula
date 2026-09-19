import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { TokenGate } from './components/TokenGate';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TokenGate>
      <App />
    </TokenGate>
  </StrictMode>,
);
