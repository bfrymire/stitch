// Generated by ts-to-zod
import { z } from 'zod';
import { yyBaseSchema } from './YyBase.js';

export type YyShader = z.infer<typeof yyShaderSchema>;
export const yyShaderSchema = yyBaseSchema
  .extend({
    resourceType: z.literal('GMShader').default('GMShader'),
    type: z.number().default(1),
  })
  .passthrough();
