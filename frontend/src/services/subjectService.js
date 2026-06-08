import API from './api';

const getSubjects = async () => {
  const response = await API.get('/subjects');
  return response.data;
};

const getSubjectById = async (id) => {
  const response = await API.get(`/subjects/${id}`);
  return response.data;
};

const createSubject = async (subjectData) => {
  const response = await API.post('/subjects', subjectData);
  return response.data;
};

const updateSubject = async (id, subjectData) => {
  const response = await API.put(`/subjects/${id}`, subjectData);
  return response.data;
};

const deleteSubject = async (id) => {
  const response = await API.delete(`/subjects/${id}`);
  return response.data;
};

const assignFaculty = async (id, facultyId) => {
  const response = await API.patch(`/subjects/${id}/assign-faculty`, { facultyId });
  return response.data;
};

const bulkAssign = async (payload) => {
  const response = await API.post('/subjects/bulk-assign', payload);
  return response.data;
};

const subjectService = {
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  assignFaculty,
  bulkAssign,
};

export default subjectService;
