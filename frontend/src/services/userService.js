import API from './api';

const getUsers = async (params = {}) => {
  const response = await API.get('/users', { params });
  return response.data;
};

const getUserById = async (id) => {
  const response = await API.get(`/users/${id}`);
  return response.data;
};

const createUser = async (userData) => {
  const response = await API.post('/users', userData);
  return response.data;
};

const updateUser = async (id, userData) => {
  const response = await API.put(`/users/${id}`, userData);
  return response.data;
};

const deleteUser = async (id) => {
  const response = await API.delete(`/users/${id}`);
  return response.data;
};

const userService = { getUsers, getUserById, createUser, updateUser, deleteUser };
export default userService;
