const AUTH_KEYS = ['token', 'user'];

const decodeJwtPayload = (token) => {
  try {
    const [, payload] = String(token || '').split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '=');
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
};

export const getStoredAuth = () => {
  const token = localStorage.getItem('token');
  const storedUser = localStorage.getItem('user');

  if (!token || !storedUser) return { token: null, user: null, valid: false };

  try {
    const user = JSON.parse(storedUser);
    const payload = decodeJwtPayload(token);
    const tokenUserId = payload?.id;
    const storedUserId = user?._id || user?.id;

    if (tokenUserId && storedUserId && String(tokenUserId) !== String(storedUserId)) {
      return { token: null, user: null, valid: false };
    }

    return { token, user, valid: true };
  } catch {
    return { token: null, user: null, valid: false };
  }
};

export const clearStoredAuth = () => {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
};

export const buildStoredUser = (data) => ({
  _id: data._id,
  id: data._id,
  name: data.name,
  email: data.email,
  role: data.role,
});
