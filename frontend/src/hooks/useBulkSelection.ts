import { useState, useCallback, useMemo } from 'react';

export interface UseBulkSelectionOptions<T> {
  items: T[];
  getItemId: (item: T) => string;
  isSelectableItem?: (item: T) => boolean;
}

export interface UseBulkSelectionReturn<T> {
  selectedIds: string[];
  selectedItems: T[];
  isSelected: (itemId: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  selectableCount: number;
  
  // Actions
  toggleSelection: (itemId: string) => void;
  toggleAll: () => void;
  selectItems: (itemIds: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;
  deselectAll: () => void;
}

export const useBulkSelection = <T>({
  items,
  getItemId,
  isSelectableItem = () => true,
}: UseBulkSelectionOptions<T>): UseBulkSelectionReturn<T> => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Get selectable items and their IDs
  const selectableItems = useMemo(() => 
    items.filter(isSelectableItem), 
    [items, isSelectableItem]
  );

  const selectableIds = useMemo(() => 
    selectableItems.map(getItemId), 
    [selectableItems, getItemId]
  );

  const selectableCount = selectableItems.length;

  // Get currently selected items
  const selectedItems = useMemo(() => 
    items.filter(item => selectedIds.includes(getItemId(item))), 
    [items, selectedIds, getItemId]
  );

  // Check if an item is selected
  const isSelected = useCallback((itemId: string) => 
    selectedIds.includes(itemId), 
    [selectedIds]
  );

  // Check if all selectable items are selected
  const isAllSelected = useMemo(() => 
    selectableCount > 0 && selectedIds.length === selectableCount &&
    selectableIds.every(id => selectedIds.includes(id)), 
    [selectedIds, selectableIds, selectableCount]
  );

  // Check if some but not all items are selected (for indeterminate state)
  const isIndeterminate = useMemo(() => 
    selectedIds.length > 0 && !isAllSelected, 
    [selectedIds.length, isAllSelected]
  );

  // Toggle selection of a single item
  const toggleSelection = useCallback((itemId: string) => {
    setSelectedIds(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  }, []);

  // Toggle all items
  const toggleAll = useCallback(() => {
    setSelectedIds(prev => 
      isAllSelected ? [] : selectableIds
    );
  }, [isAllSelected, selectableIds]);

  // Select specific items
  const selectItems = useCallback((itemIds: string[]) => {
    const validIds = itemIds.filter(id => selectableIds.includes(id));
    setSelectedIds(prev => {
      const newIds = [...new Set([...prev, ...validIds])];
      return newIds;
    });
  }, [selectableIds]);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  // Select all selectable items
  const selectAll = useCallback(() => {
    setSelectedIds(selectableIds);
  }, [selectableIds]);

  // Deselect all items
  const deselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  return {
    selectedIds,
    selectedItems,
    isSelected,
    isAllSelected,
    isIndeterminate,
    selectableCount,
    
    // Actions
    toggleSelection,
    toggleAll,
    selectItems,
    clearSelection,
    selectAll,
    deselectAll,
  };
};