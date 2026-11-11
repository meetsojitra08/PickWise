import { useSearchParams } from 'react-router';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { AccountEmptyTab } from '../components/AccountEmptyTab';
import { ChangePasswordForm } from '../components/ChangePasswordForm';
import { PreferencesForm } from '../components/PreferencesForm';
import { ProfileForm } from '../components/ProfileForm';
import {
  ACCOUNT_TABS,
  DEFAULT_ACCOUNT_TAB,
  resolveAccountTab,
} from '../lib/account-options';

function formatMemberSince(createdAt: string | null): string | null {
  if (!createdAt) {
    return null;
  }

  const parsed = new Date(createdAt);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

export function AccountPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  if (!user) {
    return null;
  }

  const activeTab = resolveAccountTab(searchParams.get('tab'));
  const memberSince = formatMemberSince(user.created_at);

  function handleTabChange(nextValue: string): void {
    const resolved = resolveAccountTab(nextValue);
    const nextParams = new URLSearchParams(searchParams);

    if (resolved === DEFAULT_ACCOUNT_TAB) {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', resolved);
    }

    setSearchParams(nextParams, { replace: true });
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="mb-8 flex flex-col gap-2 border-b border-border pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Your account
        </h1>
        <p className="text-sm text-muted-foreground">
          {user.name} · {user.email}
          {memberSince ? ` · Member since ${memberSince}` : ''}
        </p>
      </header>

      <Tabs
        value={activeTab}
        onValueChange={handleTabChange}
        className="w-full"
      >
        <TabsList aria-label="Account sections">
          {ACCOUNT_TABS.map((tab) => (
            <TabsTrigger key={tab.key} value={tab.key}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="wishlist">
          <AccountEmptyTab tab="wishlist" />
        </TabsContent>

        <TabsContent value="comparisons">
          <AccountEmptyTab tab="comparisons" />
        </TabsContent>

        <TabsContent value="conversations">
          <AccountEmptyTab tab="conversations" />
        </TabsContent>

        <TabsContent value="preferences">
          <PreferencesForm user={user} />
        </TabsContent>

        <TabsContent value="profile">
          <div className="flex flex-col gap-6">
            <ProfileForm user={user} />
            <ChangePasswordForm />
          </div>
        </TabsContent>
      </Tabs>
    </section>
  );
}
