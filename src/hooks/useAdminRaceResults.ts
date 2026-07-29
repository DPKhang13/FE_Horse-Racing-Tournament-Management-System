import { useCallback, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import {
  adminRaceResultService,
  type AdminRaceResultDraftUpdatePayload,
  type AdminRaceResult,
  type RaceResultId,
} from '../services/adminRaceResultService';
import { showToast } from '../utils/toast';

type UseAdminRaceResultsOptions = {
  initialRaceId?: RaceResultId | null;
};

const hasRaceId = (raceId: RaceResultId | null | undefined): raceId is RaceResultId =>
  raceId !== null && raceId !== undefined && String(raceId).trim() !== '';

export const useAdminRaceResults = ({
  initialRaceId = null,
}: UseAdminRaceResultsOptions = {}) => {
  const [resultList, setResultList] = useState<AdminRaceResult[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<RaceResultId | null>(initialRaceId);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((caughtError: unknown, fallback: string) => {
    const message = getApiErrorMessage(caughtError, fallback);
    setError(message);
    showToast({ tone: 'error', text: message });
    console.error(message, caughtError);
    return message;
  }, []);

  const fetchRaceResults = useCallback(
    async (raceId: RaceResultId | null = selectedRaceId) => {
      const nextRaceId = hasRaceId(raceId) ? raceId : null;
      setSelectedRaceId(nextRaceId);

      if (!nextRaceId) {
        setResultList([]);
        setError(null);
        return [];
      }

      setIsLoading(true);
      setError(null);

      try {
        const results = await adminRaceResultService.getResultsByRace(nextRaceId);
        setResultList(results);
        return results;
      } catch (caughtError) {
        handleError(caughtError, 'Unable to load race results.');
        setResultList([]);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, selectedRaceId],
  );

  const fetchAllResults = useCallback(async () => {
    setSelectedRaceId(null);
    setIsLoading(true);
    setError(null);

    try {
      const results = await adminRaceResultService.getAllResults();
      setResultList(results);
      return results;
    } catch (caughtError) {
      handleError(caughtError, 'Unable to load race results.');
      setResultList([]);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [handleError]);

  const refreshCurrentResults = useCallback(
    async (raceId: RaceResultId | null = selectedRaceId) => {
      await fetchRaceResults(raceId);
    },
    [fetchRaceResults, selectedRaceId],
  );

  const handlePublish = useCallback(
    async (raceId: RaceResultId) => {
      setIsLoading(true);
      setError(null);

      try {
        await adminRaceResultService.publishResults(raceId);
        showToast({ tone: 'success', text: 'Race results published.' });
        await refreshCurrentResults(raceId);
        return true;
      } catch (caughtError) {
        handleError(caughtError, 'Unable to publish race results.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, refreshCurrentResults],
  );

  const handleUpdateDraft = useCallback(
    async (raceId: RaceResultId, payload: AdminRaceResultDraftUpdatePayload) => {
      setIsLoading(true);
      setError(null);

      try {
        await adminRaceResultService.updateDraft(raceId, payload);
        showToast({ tone: 'success', text: 'Race results updated.' });
        await refreshCurrentResults(raceId);
        return true;
      } catch (caughtError) {
        handleError(caughtError, 'Unable to update race results.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, refreshCurrentResults],
  );

  return {
    resultList,
    selectedRaceId,
    isLoading,
    error,
    setResultList,
    setSelectedRaceId,
    fetchRaceResults,
    fetchAllResults,
    handlePublish,
    handleUpdateDraft,
  };
};