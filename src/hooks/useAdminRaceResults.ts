import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../services/apiClient';
import {
  adminRaceResultService,
  type AdminRaceResultCancelPayload,
  type AdminRaceResult,
  type AdminRaceResultUpdatePayload,
  type RaceResultId,
} from '../services/adminRaceResultService';
import { showToast } from '../utils/toast';

type UseAdminRaceResultsOptions = {
  initialRaceId?: RaceResultId | null;
  autoFetch?: boolean;
};

const hasRaceId = (raceId: RaceResultId | null | undefined): raceId is RaceResultId =>
  raceId !== null && raceId !== undefined && String(raceId).trim() !== '';

const getResultIdentity = (result: AdminRaceResult | null) => result?.resultId ?? result?.id;

export const useAdminRaceResults = ({
  initialRaceId = null,
  autoFetch = true,
}: UseAdminRaceResultsOptions = {}) => {
  const [resultList, setResultList] = useState<AdminRaceResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<AdminRaceResult | null>(null);
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
      setIsLoading(true);
      setError(null);

      try {
        const nextRaceId = hasRaceId(raceId) ? raceId : null;
        setSelectedRaceId(nextRaceId);

        const results = nextRaceId
          ? await adminRaceResultService.getResultsByRace(nextRaceId)
          : await adminRaceResultService.getAllResults();

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

  const fetchResultDetail = useCallback(
    async (id: RaceResultId) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await adminRaceResultService.getResultDetail(id);
        setSelectedResult(result);
        return result;
      } catch (caughtError) {
        handleError(caughtError, 'Unable to load race result detail.');
        setSelectedResult(null);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError],
  );

  useEffect(() => {
    if (!autoFetch) {
      return;
    }

    let isActive = true;

    queueMicrotask(() => {
      if (isActive) {
        void fetchRaceResults();
      }
    });

    return () => {
      isActive = false;
    };
  }, [autoFetch, fetchRaceResults]);

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
        console.log(`Race results published for race ${raceId}.`);
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

  const handleConfirm = useCallback(
    async (raceId: RaceResultId) => {
      setIsLoading(true);
      setError(null);

      try {
        await adminRaceResultService.confirmResults(raceId);
        console.log(`Race results confirmed for race ${raceId}.`);
        showToast({ tone: 'success', text: 'Race results confirmed.' });
        await refreshCurrentResults(raceId);
        return true;
      } catch (caughtError) {
        handleError(caughtError, 'Unable to confirm race results.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, refreshCurrentResults],
  );

  const handleCancel = useCallback(
    async (raceId: RaceResultId, payload?: AdminRaceResultCancelPayload | string) => {
      setIsLoading(true);
      setError(null);

      try {
        await adminRaceResultService.cancelResults(raceId, payload);
        console.log(`Race results cancelled for race ${raceId}.`);
        showToast({ tone: 'success', text: 'Race results cancelled.' });
        await refreshCurrentResults(raceId);
        return true;
      } catch (caughtError) {
        handleError(caughtError, 'Unable to cancel race results.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, refreshCurrentResults],
  );

  const handleUpdate = useCallback(
    async (
      id: RaceResultId,
      payload: AdminRaceResultUpdatePayload,
      refreshRaceId: RaceResultId | null = selectedRaceId,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const updatedResult = await adminRaceResultService.updateResult(id, payload);
        setSelectedResult((current) =>
          String(getResultIdentity(current)) === String(id) ? updatedResult : current,
        );
        console.log(`Race result ${id} updated.`);
        showToast({ tone: 'success', text: 'Race result updated.' });
        await refreshCurrentResults(refreshRaceId);
        return true;
      } catch (caughtError) {
        handleError(caughtError, 'Unable to update race result.');
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [handleError, refreshCurrentResults, selectedRaceId],
  );

  return {
    resultList,
    selectedResult,
    selectedRaceId,
    isLoading,
    error,
    setResultList,
    setSelectedResult,
    setSelectedRaceId,
    fetchRaceResults,
    fetchResultDetail,
    handlePublish,
    handleConfirm,
    handleCancel,
    handleUpdate,
  };
};
