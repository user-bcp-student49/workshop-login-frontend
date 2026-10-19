import { Injectable } from '@angular/core';
import axios from 'axios';
import { apiConfig, environment } from '../../environments/environment';
import { readTasks, Task } from '../models/task';
import { httpFailure } from '../utils/http-error';

@Injectable({ providedIn: 'root' })
export class TasksService {
  async list(owner: string, token: string): Promise<Task[]> {
    try {
      const response = await axios.get<unknown>(
        environment.tasksBaseUrl + apiConfig.tasksPath + '?owner=' + owner,
        { headers: { Authorization: 'Bearer ' + token } }
      );
      return readTasks(response.data);
    } catch (error: unknown) {
      throw httpFailure(error, 'No se pudo cargar el dashboard.');
    }
  }
}
