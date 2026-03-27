export function decodeToken(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function getUser() {
  const token = localStorage.getItem('token');
  return decodeToken(token);
}
