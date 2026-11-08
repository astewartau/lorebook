import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from '../../lib/api';
import { keys } from '../../app/queryClient';
import { useAuth } from '../../contexts/AuthContext';

/** The signed-in user's binders: custom ones and shared sets. */
export function useMyBinders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.binders(user?.id ?? ''),
    queryFn: () => api.getUserBinders(user!.id),
    enabled: !!user,
  });
}

export function useCollectionInfo(collectionId: string | null | undefined) {
  return useQuery({
    queryKey: keys.collectionInfo(collectionId ?? ''),
    queryFn: () => api.getCollectionInfo(collectionId!),
    enabled: !!collectionId,
  });
}

/** Makes a set's public binder (creating it the first time) public or private. */
export function useShareSet(setCode: string, setName: string) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: binders } = useMyBinders();
  const binder = binders?.find(b => b.kind === 'set' && b.setCode === setCode);
  const mutation = useMutation({
    mutationFn: async (isPublic: boolean) => {
      if (binder) {
        await api.updateBinderMeta(binder.id, { isPublic });
        return binder.id;
      }
      const created = await api.createBinder(user!.id, { kind: 'set', name: setName, setCode, isPublic });
      return created.id;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: keys.binders(user?.id ?? '') }),
  });
  return { binder, mutation };
}
