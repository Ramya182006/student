const Draft = require('../models/draftModel');

/**
 * @desc    Save/Sync Draft to Cloud
 * @route   POST /api/drafts
 * @access  Private (Admin, Faculty)
 */
const saveDraft = async (req, res, next) => {
  try {
    const { formData } = req.body;
    if (!formData) {
      res.status(400);
      throw new Error('formData is required to save a draft');
    }

    // Upsert draft for the authenticated user
    const draft = await Draft.findOneAndUpdate(
      { user_id: req.user._id },
      { formData },
      { new: true, upsert: true }
    );

    res.json({
      message: 'Draft saved/synced successfully',
      draft
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve Synced Draft
 * @route   GET /api/drafts
 * @access  Private (Admin, Faculty)
 */
const getDraft = async (req, res, next) => {
  try {
    const draft = await Draft.findOne({ user_id: req.user._id });
    if (!draft) {
      return res.status(404).json({ message: 'No draft found for this user' });
    }
    res.json(draft);
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete/Clear Draft
 * @route   DELETE /api/drafts
 * @access  Private (Admin, Faculty)
 */
const deleteDraft = async (req, res, next) => {
  try {
    const result = await Draft.deleteOne({ user_id: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No draft to delete' });
    }
    res.json({ message: 'Draft cleared successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  saveDraft,
  getDraft,
  deleteDraft
};
