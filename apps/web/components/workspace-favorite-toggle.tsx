'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@heroui/button';
import { Star } from 'lucide-react';

const FAVORITE_REQUEST_DEBOUNCE_MS = 1000;

interface FavoriteWorkspaceResponse {
  favoriteShopId: string | null;
}

interface FavoriteMutationPayload {
  shopId: string;
  isFavorite: boolean;
}

interface WorkspaceFavoriteContextValue {
  favoriteShopId: string | null;
  isSaving: boolean;
  toggleFavorite: (shopId: string) => void;
}

interface WorkspaceFavoriteProviderProps {
  initialFavoriteShopId: string | null;
  children: ReactNode;
}

interface WorkspaceFavoriteToggleProps {
  shopId: string;
  shopName: string;
}

const WorkspaceFavoriteContext = createContext<WorkspaceFavoriteContextValue | null>(null);

export function WorkspaceFavoriteProvider({
  initialFavoriteShopId,
  children,
}: WorkspaceFavoriteProviderProps) {
  const router = useRouter();
  const [favoriteShopId, setFavoriteShopId] = useState<string | null>(initialFavoriteShopId);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPayloadRef = useRef<FavoriteMutationPayload | null>(null);
  const persistedFavoriteRef = useRef<string | null>(initialFavoriteShopId);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setFavoriteShopId(initialFavoriteShopId);
    persistedFavoriteRef.current = initialFavoriteShopId;
    pendingPayloadRef.current = null;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, [initialFavoriteShopId]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const persistFavorite = useCallback(async () => {
    const payload = pendingPayloadRef.current;
    if (!payload) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/mis-barberias/favorite', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`favorite_request_failed_${response.status}`);
      }

      const data = (await response.json()) as FavoriteWorkspaceResponse;
      const nextFavoriteShopId = data.favoriteShopId || null;
      persistedFavoriteRef.current = nextFavoriteShopId;
      pendingPayloadRef.current = null;
      setFavoriteShopId(nextFavoriteShopId);
      startTransition(() => {
        router.refresh();
      });
    } catch {
      pendingPayloadRef.current = null;
      setFavoriteShopId(persistedFavoriteRef.current);
    } finally {
      setIsSaving(false);
    }
  }, [router, startTransition]);

  const schedulePersist = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void persistFavorite();
    }, FAVORITE_REQUEST_DEBOUNCE_MS);
  }, [persistFavorite]);

  const toggleFavorite = useCallback(
    (shopId: string) => {
      if (isSaving) {
        return;
      }

      setFavoriteShopId((currentFavoriteShopId) => {
        const nextFavoriteShopId = currentFavoriteShopId === shopId ? null : shopId;
        pendingPayloadRef.current = {
          shopId,
          isFavorite: nextFavoriteShopId === shopId,
        };
        schedulePersist();
        return nextFavoriteShopId;
      });
    },
    [isSaving, schedulePersist],
  );

  const contextValue = useMemo<WorkspaceFavoriteContextValue>(
    () => ({
      favoriteShopId,
      isSaving,
      toggleFavorite,
    }),
    [favoriteShopId, isSaving, toggleFavorite],
  );

  return (
    <WorkspaceFavoriteContext.Provider value={contextValue}>
      {children}
    </WorkspaceFavoriteContext.Provider>
  );
}

function useWorkspaceFavorite() {
  const context = useContext(WorkspaceFavoriteContext);
  if (!context) {
    throw new Error('WorkspaceFavoriteToggle must be used inside WorkspaceFavoriteProvider.');
  }

  return context;
}

export function WorkspaceFavoriteToggle({ shopId, shopName }: WorkspaceFavoriteToggleProps) {
  const { favoriteShopId, isSaving, toggleFavorite } = useWorkspaceFavorite();
  const favorite = favoriteShopId === shopId;
  const label = favorite ? `Quitar ${shopName} de favoritas` : `Marcar ${shopName} como favorita`;

  return (
    <Button
      type="button"
      aria-label={label}
      aria-pressed={favorite}
      title={label}
      isDisabled={isSaving}
      isIconOnly
      radius="full"
      variant="light"
      onPress={() => toggleFavorite(shopId)}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
        favorite
          ? 'border-amber-400/30 bg-amber-500/15 text-amber-500 dark:text-amber-300'
          : 'border-slate-900/15 bg-white/80 text-slate-500 hover:border-amber-400/40 hover:text-amber-500 dark:border-white/15 dark:bg-white/[0.04] dark:text-zinc-300 dark:hover:border-amber-300/40 dark:hover:text-amber-300'
      } ${isSaving ? 'cursor-wait opacity-70' : ''}`}
    >
      <Star className={favorite ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
    </Button>
  );
}
