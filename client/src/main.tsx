import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress Vite HMR WebSocket errors in development only
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  const originalError = console.error;
  const originalWarn = console.warn;
  
  // Filter out Vite HMR connection errors
  const filterViteErrors = (...args: any[]) => {
    const errorString = String(args.join(' ')).toLowerCase();
    
    // Suppress Vite HMR errors
    if (errorString.includes('vite') && (
      errorString.includes('server connection lost') ||
      errorString.includes('polling for restart') ||
      errorString.includes('24678') ||
      errorString.includes('connection') && errorString.includes('failed')
    )) {
      return; // Silently ignore
    }
    
    // Suppress Vite HMR WebSocket errors
    if (errorString.includes('websocket') && (
      errorString.includes('24678') ||
      errorString.includes('localhost:undefined') ||
      (errorString.includes('/?token=') && errorString.includes('vite'))
    )) {
      return; // Silently ignore
    }
    
    // Suppress network timeout errors for Vite HMR port
    if (errorString.includes('err_connection_timed_out') && (
      errorString.includes('24678') ||
      errorString.includes('spock.replit.dev:24678')
    )) {
      return; // Silently ignore
    }
    
    // Suppress WebSocket connection errors to port 24678
    if (errorString.includes('websocket') && errorString.includes('24678')) {
      return; // Silently ignore
    }
    
    // Suppress GET errors to port 24678
    if (errorString.includes('get http') && errorString.includes('24678')) {
      return; // Silently ignore
    }
    
    // Pass through other errors
    originalError.apply(console, args);
  };
  
  console.error = filterViteErrors;
  
  // Also filter warnings
  const filterViteWarnings = (...args: any[]) => {
    const warnString = String(args.join(' ')).toLowerCase();
    if (warnString.includes('vite') && warnString.includes('server connection')) {
      return; // Silently ignore
    }
    originalWarn.apply(console, args);
  };
  
  console.warn = filterViteWarnings;
}

createRoot(document.getElementById("root")!).render(<App />);
