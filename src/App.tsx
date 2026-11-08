import { QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProfileProvider } from './contexts/ProfileContext';
import { CardDataProvider } from './contexts/CardDataContext';
import { CollectionProvider } from './contexts/CollectionContext';
import { ToastProvider } from './contexts/ToastContext';
import { queryClient } from './app/queryClient';
import { routes } from './app/routes';

const router = createBrowserRouter(routes);

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <ProfileProvider>
            <CardDataProvider>
              <CollectionProvider>
                <RouterProvider router={router} />
              </CollectionProvider>
            </CardDataProvider>
          </ProfileProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
