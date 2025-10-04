'use server';

import { getUser, getUserTeams } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

/**
 * Server Action: Get Current User Session Data
 *
 * This function serves as the official "bridge" between server-side
 * session management and client components. It provides sanitized
 * user data that is safe to expose to the client.
 *
 * @returns User session object with id, email, name
 * @throws Redirects to /sign-in if no valid session exists
 */
export async function getCurrentUserSession() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Return only the data needed by client components
  // Never expose sensitive fields like password hashes, tokens, etc.
  return {
    id: user.id,
    email: user.email,
    name: user.name || null,
    employeeCode: user.employeeCode || null,
    department: user.department || null,
    jobTitle: user.jobTitle || null,
  };
}

/**
 * Server Action: Get Current User's Primary Role
 *
 * Retrieves the user's role from their team membership.
 * If a user is a member of multiple teams, returns the role from the first team.
 * This is the simplified version for navigation and conditional UI rendering.
 *
 * @returns The user's role as a string (e.g., "PROCUREMENT_MANAGER") or null
 */
export async function getCurrentUserRole() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user's teams to fetch their role
  const userTeams = await getUserTeams(user.id);

  // If user has at least one team membership, return the role from the first team
  // In a real system with multiple team memberships, you might need to implement
  // logic to determine which role to use for navigation
  if (userTeams.length > 0) {
    return userTeams[0].role;
  }

  // User has no team memberships - return null
  // The sidebar should handle this gracefully
  return null;
}
