/** Who is calling and on behalf of which organization. Passed explicitly to services. */
export interface RequestContext {
  userId: string;
  tenantId: string;
  correlationId: string;
}
