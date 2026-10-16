export interface UpdateProfileDTO {
  firstName?: string;
  lastName?: string;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AdminUpdateStatusDTO {
  status: 'ACTIVE' | 'SUSPENDED';
}
