import { z } from 'zod';

export const adminUpdateStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED'], {
    errorMap: () => ({ message: "Status must be either 'ACTIVE' or 'SUSPENDED'" }),
  }),
});
