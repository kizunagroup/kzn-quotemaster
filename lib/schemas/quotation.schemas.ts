import { z } from "zod";

// Query schema for API filtering
export const quotationQuerySchema = z.object({
  search: z.string().optional(),
  period: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  supplier: z.string().optional(),
  region: z.string().optional(),
  teamId: z.coerce.number().positive().optional(),
  status: z.enum(['pending', 'approved', 'cancelled', 'negotiation', 'all']).default('all'),
  sort: z.string().default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
});

// Status update schema
export const quotationStatusUpdateSchema = z.object({
  id: z.number().positive(),
  status: z.enum(['pending', 'approved', 'cancelled', 'negotiation']),
  reason: z.string().optional(),
});

// Type exports for TypeScript integration
export type QuotationQueryInput = z.infer<typeof quotationQuerySchema>;
export type QuotationStatusUpdateInput = z.infer<typeof quotationStatusUpdateSchema>;