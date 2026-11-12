import { useState } from 'react';

function readSelection(storageKey: string, productId: number): boolean {
  try {
    const stored = window.localStorage.getItem(storageKey);
    const ids: unknown = stored ? JSON.parse(stored) : [];
    return Array.isArray(ids) && ids.includes(productId);
  } catch {
    return false;
  }
}

function toggleSelection(storageKey: string, productId: number): boolean {
  const selected = readSelection(storageKey, productId);
  try {
    const stored = window.localStorage.getItem(storageKey);
    const ids: unknown = stored ? JSON.parse(stored) : [];
    const currentIds = Array.isArray(ids)
      ? ids.filter((id): id is number => typeof id === 'number')
      : [];
    const nextIds = selected
      ? currentIds.filter((id) => id !== productId)
      : [...new Set([...currentIds, productId])];
    window.localStorage.setItem(storageKey, JSON.stringify(nextIds));
  } catch {
    // Keep the current page usable when browser storage is unavailable.
  }
  return !selected;
}

export function useDeviceProductSelection(productId: number) {
  const [isWishlisted, setIsWishlisted] = useState(() =>
    readSelection('pickwise:wishlist', productId),
  );
  const [isCompared, setIsCompared] = useState(() =>
    readSelection('pickwise:compare', productId),
  );

  return {
    isWishlisted,
    isCompared,
    toggleWishlist: () =>
      setIsWishlisted(toggleSelection('pickwise:wishlist', productId)),
    toggleCompare: () =>
      setIsCompared(toggleSelection('pickwise:compare', productId)),
  };
}
