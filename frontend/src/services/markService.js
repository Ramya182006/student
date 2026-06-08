import API from './api';

const getMarkEntries = async () => {
  const response = await API.get('/mark-entries');
  return response.data;
};

const createMarkEntry = async (markData) => {
  const response = await API.post('/mark-entries', markData);
  return response.data;
};

const updateMarkEntry = async (id, markData) => {
  const response = await API.put(`/mark-entries/${id}`, markData);
  return response.data;
};

const importCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await API.post('/import', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

const importAccountsCSV = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await API.post('/import/accounts', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

// Draft recovery backup sync
const saveDraftToCloud = async (formData) => {
  const response = await API.post('/drafts', { formData });
  return response.data;
};

const getDraftFromCloud = async () => {
  const response = await API.get('/drafts');
  return response.data;
};

const deleteDraftFromCloud = async () => {
  const response = await API.delete('/drafts');
  return response.data;
};

const deleteMarkEntry = async (id) => {
  const response = await API.delete(`/mark-entries/${id}`);
  return response.data;
};

const markService = {
  getMarkEntries,
  createMarkEntry,
  updateMarkEntry,
  deleteMarkEntry,
  importCSV,
  importAccountsCSV,
  saveDraftToCloud,
  getDraftFromCloud,
  deleteDraftFromCloud,
};

export default markService;
