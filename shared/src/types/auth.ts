export interface UserDto {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: UserDto;
  token: string;
}

export interface AuthSession {
  userId: string;
  email: string;
}
