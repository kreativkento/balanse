import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import { router } from './routes';
import { AppErrorBoundary } from './components/error/AppErrorBoundary';
import '../styles/fonts.css';

export default function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
      <Toaster position="top-center" richColors closeButton />
    </AppErrorBoundary>
  );
}
