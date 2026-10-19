import { Injectable } from '@angular/core';
import axios from 'axios';
import { apiConfig, environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, readLoginResponse } from '../models/auth';
import { httpFailure } from '../utils/http-error';

@Injectable({ providedIn: 'root' })
export class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await axios.post<unknown>(
        environment.authBaseUrl + apiConfig.loginPath,
        { ...credentials, client: apiConfig.client },
        { timeout: apiConfig.loginTimeoutMs }
      );
      return readLoginResponse(response.data);
    } catch (error: unknown) {
      throw httpFailure(error, 'No se pudo autenticar. Intente nuevamente.');
    }
  }
}
