import { useCallback } from 'react';

/**
 * Hook to manage local draft recovery in localStorage.
 * @param {string} draftKey - Unique key for this draft in localStorage
 */
const useDraft = (draftKey = 'mark_draft') => {
  const saveDraft = useCallback(
    (data) => {
      try {
        const savedAt = new Date().toISOString();
        localStorage.setItem(draftKey, JSON.stringify({ data, savedAt }));
        return savedAt;
      } catch (_) {}
      return null;
    },
    [draftKey]
  );

  const loadDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch (_) {}
  }, [draftKey]);

  return { saveDraft, loadDraft, clearDraft };
};

export default useDraft;
