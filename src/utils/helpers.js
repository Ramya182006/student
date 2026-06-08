/**
 * Calculates grade based on total marks
 * @param {number} total 
 * @returns {string} grade
 */
const calculateGrade = (total) => {
  const roundedTotal = Math.round(total);
  if (roundedTotal >= 90) return 'O';
  if (roundedTotal >= 80) return 'A+';
  if (roundedTotal >= 70) return 'A';
  if (roundedTotal >= 60) return 'B+';
  if (roundedTotal >= 50) return 'B';
  return 'F';
};

module.exports = {
  calculateGrade
};
