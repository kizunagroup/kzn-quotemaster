import { redirect } from 'next/navigation';
import { getUser } from '@/lib/db/queries';

/**
 * Root Page - Authentication-based Redirect
 *
 * Server Component that handles routing based on authentication status:
 * - Unauthenticated users → /sign-in
 * - Authenticated users → /trang-chu (Home Dashboard)
 */
export default async function RootPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  redirect('/trang-chu');
}
