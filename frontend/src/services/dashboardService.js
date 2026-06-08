import API from './api';

const getKPIs = async () => {
  const response = await API.get('/dashboard/kpis');
  return response.data;
};

const getMetrics = async () => {
  const response = await API.get('/metrics');
  return response.data;
};

const dashboardService = {
  getKPIs,
  getMetrics,
};

export default dashboardService;
