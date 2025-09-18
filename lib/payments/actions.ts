'use server';

import { redirect } from 'next/navigation';
import { createCheckoutSession, createCustomerPortalSession, stripe } from './stripe';
import { withTeam } from '@/lib/auth/middleware';

export const checkoutAction = withTeam(async (formData, team) => {
  // Check if Stripe is configured before proceeding
  if (!stripe) {
    throw new Error('Stripe is not configured. Please contact support.');
  }

  const priceId = formData.get('priceId') as string;
  await createCheckoutSession({ team: team, priceId });
});

export const customerPortalAction = withTeam(async (_, team) => {
  // Check if Stripe is configured before proceeding
  if (!stripe) {
    throw new Error('Stripe is not configured. Please contact support.');
  }

  const portalSession = await createCustomerPortalSession(team);
  redirect(portalSession.url);
});
