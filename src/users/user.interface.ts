export interface User {
  id: number;
  first_name: string;
  family_name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  role: string;
  fcm_token?: string | null;  // Optional, can be null if not set
}
