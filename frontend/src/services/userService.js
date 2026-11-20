import api from './api';

// `photo` is an optional File. Sent as multipart form data, which is how the backend's upload handler expects it.
export function updateProfile({ name, photo }) {
  const form = new FormData();
  if (name !== undefined) form.append('name', name);
  if (photo) form.append('profile_image', photo);
  return api.put('/users/me', form).then((r) => r.data.user);
}
