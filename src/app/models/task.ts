import { isRecord, PublicError } from '../utils/http-error';

export interface Task {
  status?: string;
  priority?: string | number;
  owner?: string | number;
  title?: string;
  description?: string;
}

export interface TaskView extends Task {
  label: string;
}

export function readTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) throw new PublicError('El backend respondió con tareas inválidas.');
  return value.map((entry: unknown): Task => {
    if (!isRecord(entry)) throw new PublicError('El backend respondió con tareas inválidas.');
    const { status, priority, owner, title, description } = entry;
    if ((status !== undefined && typeof status !== 'string') ||
        (priority !== undefined && typeof priority !== 'string' && typeof priority !== 'number') ||
        (owner !== undefined && typeof owner !== 'string' && typeof owner !== 'number') ||
        (title !== undefined && typeof title !== 'string') ||
        (description !== undefined && typeof description !== 'string')) {
      throw new PublicError('El backend respondió con tareas inválidas.');
    }
    return { status, priority, owner, title, description };
  });
}
