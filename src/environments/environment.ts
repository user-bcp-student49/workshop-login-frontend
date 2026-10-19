export const environment = {
  authBaseUrl: 'http://localhost:8080',
  tasksBaseUrl: 'http://localhost:8000'
};

export const apiConfig = {
  loginPath: '/auth/login',
  tasksPath: '/api/tasks',
  client: 'angular-workshop',
  loginTimeoutMs: 5000
};

export const appPaths = {
  login: '/login',
  dashboard: '/dashboard'
};
