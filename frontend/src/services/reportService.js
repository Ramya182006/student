import API from './api';

const getStudentReport = async (studentId) => {
  const response = await API.get(`/students/${studentId}`);
  return response.data;
};

const reportService = {
  getStudentReport,
};

export default reportService;
