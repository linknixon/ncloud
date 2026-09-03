import { useEffect, useRef } from 'react';

/**
 * Custom React hook to automatically preserve form/draft data in localStorage
 * as the user types, protecting against page refreshes or unexpected outages.
 *
 * @param {string} draftKey - Unique storage key for the draft
 * @param {any} state - Current state value (form object, text string, array)
 * @param {Function} setState - State setter function
 * @param {Object} options - Options ({ debounceMs: 300, enabled: true })
 * @returns {Object} { clearDraft, lastSaved }
 */
export function useAutoSaveDraft(draftKey, state, setState, options = {}) {
  const isMount = useRef(true);
  const enabled = options.enabled !== false;

  // Restore saved draft on mount
  useEffect(() => {
    if (!draftKey || !enabled) return;
    try {
      const saved = localStorage.getItem(`nova_draft_${draftKey}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed !== undefined && parsed !== null) {
          setState(prev => {
            if (typeof prev === 'object' && prev !== null && !Array.isArray(prev) && typeof parsed === 'object') {
              return { ...prev, ...parsed };
            }
            return parsed;
          });
        }
      }
    } catch (err) {
      console.warn(`AutoSave draft restore error [${draftKey}]:`, err);
    }
  }, [draftKey, enabled]);

  // Save draft on state changes with debouncing
  useEffect(() => {
    if (isMount.current) {
      isMount.current = false;
      return;
    }
    if (!draftKey || !enabled || state === undefined || state === null) return;

    const handler = setTimeout(() => {
      try {
        localStorage.setItem(`nova_draft_${draftKey}`, JSON.stringify(state));
        localStorage.setItem(`nova_draft_timestamp_${draftKey}`, String(Date.now()));
      } catch (err) {
        console.warn(`AutoSave draft save error [${draftKey}]:`, err);
      }
    }, options.debounceMs || 300);

    return () => clearTimeout(handler);
  }, [draftKey, state, enabled]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(`nova_draft_${draftKey}`);
      localStorage.removeItem(`nova_draft_timestamp_${draftKey}`);
    } catch (err) {}
  };

  return { clearDraft };
}
