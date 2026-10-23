export interface OrganizationJwtPayload {
  sub: string;
  name: string;
  email: string;
  slug: string;
  iat?: number;
  exp?: number;
}
