import { User, Session } from '@prisma/client';
import { SafeUser } from '../utils/helpers.js';

export interface AuthSuccessResponse {
  user: SafeUser;
  message?: string;
}

export interface RegisterDTO {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface ForgotPasswordDTO {
  email: string;
}

export interface ResetPasswordDTO {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface VerifyEmailDTO {
  token: string;
}

export interface SendOtpDTO {
  email: string;
}

export interface VerifyOtpDTO {
  email: string;
  code: string;
}

export interface AuthenticatedUserContext {
  user: User;
  session: Session;
}
