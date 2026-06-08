import API from './api';

const getStudents = async (params = {}) => {
  const response = await API.get('/students', { params });
  return response.data;
};

const getStudentById = async (id) => {
  const response = await API.get(`/students/${id}`);
  if (response.data?.student) {
    return {
      ...response.data.student,
      marks: response.data.marks || [],
      assignedSubjects: response.data.assignedSubjects || [],
    };
  }
  return response.data;
};

const getMyReport = async () => {
  const response = await API.get('/students/me');
  return response.data;
};

const createStudent = async (studentData) => {
  const response = await API.post('/students', studentData);
  return response.data;
};

const updateStudent = async (id, studentData) => {
  const response = await API.put(`/students/${id}`, studentData);
  return response.data;
};

const deleteStudent = async (id) => {
  const response = await API.delete(`/students/${id}`);
  return response.data;
};

const publishReportCard = async (id) => {
  const response = await API.patch(`/students/${id}/publish`);
  return response.data;
};

const unpublishReportCard = async (id) => {
  const response = await API.patch(`/students/${id}/unpublish`);
  return response.data;
};

const studentService = {
  getStudents,
  getStudentById,
  getMyReport,
  createStudent,
  updateStudent,
  deleteStudent,
  publishReportCard,
  unpublishReportCard,
};

export default studentService;
