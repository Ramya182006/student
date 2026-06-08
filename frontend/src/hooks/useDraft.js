import { useCallback } from 'react';
import markService from '../services/markService';

/**
 * Hook to manage draft mark entries in localStorage with optional cloud backup.
 * @param {string} draftKey - Unique key for this draft in localStorage
 */
const useDraft = (draftKey = 'mark_draft') => {
  const saveDraft = useCallback(
    (data) => {
      try {
        localStorage.setItem(draftKey, JSON.stringify({ data, savedAt: new Date().toISOString() }));
      } catch (_) {}
      // Best-effort cloud backup (non-blocking)
      markService.saveDraftToCloud(data).catch(() => {});
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
    localStorage.removeItem(draftKey);
    markService.deleteDraftFromCloud().catch(() => {});
  }, [draftKey]);

  return { saveDraft, loadDraft, clearDraft };
};

export default useDraft;
