// Decodes the payload of a JWT without verifying the signature.
// Signature verification happens on the server; this is only for reading claims in the UI.
export function decodeToken(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

// Reads the current token from storage and returns its decoded payload
export function getUser() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  return decodeToken(token);
}
