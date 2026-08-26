import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from './settings.service';
import { QK } from '@/constants/queryKeys';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/lib/api-error';
import type { UpdateSettingsPayload } from './settings.types';

export const useSettings = () =>
  useQuery({ queryKey: QK.SETTINGS, queryFn: settingsApi.get });

export const useUpdateSettings = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateSettingsPayload) => settingsApi.update(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(QK.SETTINGS, updated);
      queryClient.invalidateQueries({ queryKey: QK.FAMILY });
      toast.success('Settings updated');
    },
    onError: (error) => toast.error('Could not update settings', getApiErrorMessage(error)),
  });
};
