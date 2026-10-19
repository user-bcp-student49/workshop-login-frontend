import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, NgZone, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { appPaths } from '../../environments/environment';
import { User } from '../models/auth';
import { Task, TaskView } from '../models/task';
import { SessionService } from '../services/session.service';
import { TasksService } from '../services/tasks.service';
import { notifyError } from '../utils/http-error';
import { formatTaskLabel } from '../utils/legacy-format';

const STATUS_LABELS: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En progreso',
  DONE: 'Completado',
  RESUELTO: 'Resuelto',
  COMPLETED: 'Completado'
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  tasks: Task[] = [];
  visibleTasks: TaskView[] = [];
  user: User = {};
  loading = true;
  error = '';

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private zone: NgZone,
    private tasksService: TasksService,
    private session: SessionService
  ) {}

  statusLabel(status: string | undefined): string {
    return STATUS_LABELS[(status || '').toUpperCase()] || status || '';
  }

  async ngOnInit(): Promise<void> {
    try {
      const authenticated = this.session.read();
      if (!authenticated) {
        const navigated = await this.router.navigate([appPaths.login]);
        if (!navigated) throw new Error('Login navigation was cancelled');
        return;
      }
      this.user = authenticated.user;
      const tasks = await this.tasksService.list(this.user.username || '', authenticated.token);
      const visibleTasks = tasks
        .filter(task => task.status !== 'ARCHIVED')
        .map(task => ({ ...task, label: formatTaskLabel(task) }))
        .sort((first, second) =>
          (first.priority ?? Number.NaN) > (second.priority ?? Number.NaN) ? -1 : 1);
      this.zone.run(() => {
        this.tasks = tasks;
        this.visibleTasks = visibleTasks;
      });
    } catch (error: unknown) {
      this.error = notifyError(error, 'No se pudo cargar el dashboard.');
    } finally {
      this.zone.run(() => {
        this.loading = false;
        this.cdr.detectChanges();
      });
    }
  }

  async logout(): Promise<void> {
    try {
      this.session.clear();
      const navigated = await this.router.navigate([appPaths.login]);
      if (!navigated) throw new Error('Login navigation was cancelled');
    } catch (error: unknown) {
      this.error = notifyError(error, 'No se pudo cerrar la sesión.');
      this.cdr.markForCheck();
    }
  }
}
