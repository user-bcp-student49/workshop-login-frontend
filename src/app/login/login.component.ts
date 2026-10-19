import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { appPaths } from '../../environments/environment';
import { DEFAULT_PREFERENCES, Preferences } from '../models/auth';
import { AuthService } from '../services/auth.service';
import { SessionService } from '../services/session.service';
import { notifyError } from '../utils/http-error';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  username = '';
  password = '';
  busy = false;
  message = '';
  preferences: Preferences = { ...DEFAULT_PREFERENCES };

  constructor(
    private router: Router,
    private auth: AuthService,
    private session: SessionService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {
    try {
      this.preferences = this.session.readPreferences();
    } catch (error: unknown) {
      this.message = notifyError(error, 'No se pudieron cargar las preferencias guardadas.');
    }
  }

  async login(): Promise<void> {
    this.message = '';
    if (typeof this.username !== 'string' || this.username.trim() === '') {
      this.message = 'Ingrese un usuario.';
      return;
    }
    if (typeof this.password !== 'string' || this.password.trim() === '') {
      this.message = 'Ingrese una contraseña.';
      return;
    }
    this.busy = true;
    try {
      const authenticated = await this.auth.login({ username: this.username, password: this.password });
      this.session.save(authenticated, this.preferences);
      const navigated = await this.router.navigate([appPaths.dashboard]);
      if (!navigated) throw new Error('Dashboard navigation was cancelled');
    } catch (error: unknown) {
      this.message = notifyError(error, 'No se pudo autenticar. Intente nuevamente.');
    } finally {
      this.zone.run(() => {
        this.busy = false;
        this.cdr.markForCheck();
      });
    }
  }
}
