import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router';
import { AppLayout } from '@/app/layouts/AppLayout';
import { AuthLayout } from '@/app/layouts/AuthLayout';
import { HomePage } from '@/app/pages/HomePage';
import { NotFoundPage } from '@/app/pages/NotFoundPage';
import { RoutePlaceholderPage } from '@/app/pages/RoutePlaceholderPage';
import { AuthGuardFallback } from '@/features/auth/components/AuthGuardFallback';
import { RequireAdmin } from '@/features/auth/components/RequireAdmin';
import { RequireAuth } from '@/features/auth/components/RequireAuth';
import { RequireGuest } from '@/features/auth/components/RequireGuest';

const AdminLayout = lazy(() =>
  import('@/app/layouts/AdminLayout').then((module) => ({
    default: module.AdminLayout,
  })),
);

const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);

const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((module) => ({
    default: module.RegisterPage,
  })),
);

const AccountPage = lazy(() =>
  import('@/features/account/pages/AccountPage').then((module) => ({
    default: module.AccountPage,
  })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<AuthGuardFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/products"
            element={
              <RoutePlaceholderPage
                title="Browse catalog"
                description="Product search, category filters, sorting, and Value Scores are scheduled for Phase 2."
              />
            }
          />
          <Route
            path="/compare"
            element={
              <RoutePlaceholderPage
                title="Compare products"
                description="Side-by-side specification comparisons and AI verdicts arrive in Phases 4 and 5."
              />
            }
          />
          <Route
            path="/assistant"
            element={
              <RoutePlaceholderPage
                title="Shopping assistant"
                description="Budget-aware, database-grounded AI recommendations arrive in Phase 5."
              />
            }
          />

          <Route element={<RequireAuth />}>
            <Route path="/account" element={<AccountPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route element={<RequireGuest />}>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
        </Route>

        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route
              index
              element={
                <RoutePlaceholderPage
                  title="Admin overview"
                  description="Catalog management, user controls, review moderation, AI usage analytics, and the audit log arrive in Phase 7."
                  actionLabel="Return to storefront"
                />
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}
