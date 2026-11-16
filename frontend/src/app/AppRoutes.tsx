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
import { CatalogPage } from '@/features/catalog/pages/CatalogPage';
import { AdminDashboardPage } from '@/features/admin/pages/AdminDashboardPage';

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

const ComparePage = lazy(() =>
  import('@/features/compare/pages/ComparePage').then((module) => ({
    default: module.ComparePage,
  })),
);

const SharedComparisonPage = lazy(() =>
  import('@/features/compare/pages/SharedComparisonPage').then((module) => ({
    default: module.SharedComparisonPage,
  })),
);

const ProductDetailRoute = lazy(() =>
  import('@/features/catalog/pages/ProductDetailPage').then((module) => ({
    default: module.ProductDetailRoute,
  })),
);

const AssistantPage = lazy(() =>
  import('@/features/assistant/pages/AssistantPage').then((module) => ({
    default: module.AssistantPage,
  })),
);

const VerdictPreviewPage = lazy(() =>
  import('@/app/pages/VerdictPreviewPage').then((module) => ({
    default: module.VerdictPreviewPage,
  })),
);

export function AppRoutes() {
  return (
    <Suspense fallback={<AuthGuardFallback />}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<CatalogPage />} />
          <Route path="/products/:slug" element={<ProductDetailRoute />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route
            path="/compare/shared/:token"
            element={<SharedComparisonPage />}
          />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/preview/verdict" element={<VerdictPreviewPage />} />

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
            <Route index element={<AdminDashboardPage />} />
            <Route
              path="categories"
              element={
                <RoutePlaceholderPage
                  title="Category Management"
                  description="Manage categories and spec definitions (arriving in P7-S3)."
                  actionLabel="Back to Dashboard"
                  actionTo="/admin"
                />
              }
            />
            <Route
              path="products"
              element={
                <RoutePlaceholderPage
                  title="Product Catalog"
                  description="CRUD products, manage specs, and upload product images (arriving in P7-S4 to P7-S6)."
                  actionLabel="Back to Dashboard"
                  actionTo="/admin"
                />
              }
            />
            <Route
              path="users"
              element={
                <RoutePlaceholderPage
                  title="User Management"
                  description="Activate, deactivate, and assign administrative roles (arriving in P7-S7)."
                  actionLabel="Back to Dashboard"
                  actionTo="/admin"
                />
              }
            />
            <Route
              path="reviews"
              element={
                <RoutePlaceholderPage
                  title="Review Moderation"
                  description="Approve, reject, or remove customer reviews (arriving in P7-S8)."
                  actionLabel="Back to Dashboard"
                  actionTo="/admin"
                />
              }
            />
            <Route
              path="ai"
              element={
                <RoutePlaceholderPage
                  title="AI Usage Analytics"
                  description="Monitor assistant, verdict, and review summary usage and costs (arriving in P7-S9)."
                  actionLabel="Back to Dashboard"
                  actionTo="/admin"
                />
              }
            />
            <Route
              path="activity-logs"
              element={
                <RoutePlaceholderPage
                  title="Audit Log Viewer"
                  description="Inspect append-only administrative action records and diffs (arriving in P7-S10)."
                  actionLabel="Back to Dashboard"
                  actionTo="/admin"
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
