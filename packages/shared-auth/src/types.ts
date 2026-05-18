export type JwtPayload = {
  id: string;
  email: string;
  role?: string;
  roles?: string[];
};
