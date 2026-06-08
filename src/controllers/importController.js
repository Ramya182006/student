const fs = require('fs');
const path = require('path');
const importService = require('../services/importService');

/**
 * @desc    Bulk CSV Grade Import
 * @route   POST /api/import
 * @access  Private (Admin)
 */
const importCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a CSV file');
    }

    const filePath = req.file.path;

    try {
      const summary = await importService.importCSV(filePath, req.user?._id);
      
      // Clean up uploaded file
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temporary CSV file:', err);
      });

      res.json(summary);
    } catch (importError) {
      // Ensure file is deleted even if import fails
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temporary CSV file after error:', err);
      });

      return res.status(400).json({
        message: importError.message || 'CSV import failed',
        details: importError.details || null
      });
    }
  } catch (error) {
    next(error);
  }
};

const importAccountsCSV = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error('Please upload a CSV file');
    }

    const filePath = req.file.path;

    try {
      const summary = await importService.importAccountsCSV(filePath);
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temporary CSV file:', err);
      });
      res.json(summary);
    } catch (importError) {
      fs.unlink(filePath, (err) => {
        if (err) console.error('Failed to delete temporary CSV file after error:', err);
      });
      return res.status(400).json({
        message: importError.message || 'CSV account import failed',
        details: importError.details || null
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  importCSV,
  importAccountsCSV
};
