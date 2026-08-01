// Simple localStorage-backed session helpers. Called from client components only.

function getUserToken() {
  return localStorage.getItem('userToken');
}
function setUserSession(token, user) {
  localStorage.setItem('userToken', token);
  localStorage.setItem('user', JSON.stringify(user));
}
function getUser() {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}
function clearUserSession() {
  localStorage.removeItem('userToken');
  localStorage.removeItem('user');
}

function getWorkerToken() {
  return localStorage.getItem('workerToken');
}
function setWorkerSession(token, worker) {
  localStorage.setItem('workerToken', token);
  localStorage.setItem('worker', JSON.stringify(worker));
}
function getWorker() {
  const raw = localStorage.getItem('worker');
  return raw ? JSON.parse(raw) : null;
}
function clearWorkerSession() {
  localStorage.removeItem('workerToken');
  localStorage.removeItem('worker');
}

// Admin has no individual identity, just a shared-password session token.
function getAdminToken() {
  return localStorage.getItem('adminToken');
}
function setAdminSession(token) {
  localStorage.setItem('adminToken', token);
}
function clearAdminSession() {
  localStorage.removeItem('adminToken');
}

export {
  getUserToken,
  setUserSession,
  getUser,
  clearUserSession,
  getWorkerToken,
  setWorkerSession,
  getWorker,
  clearWorkerSession,
  getAdminToken,
  setAdminSession,
  clearAdminSession,
};
