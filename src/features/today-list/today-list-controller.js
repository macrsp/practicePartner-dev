/**
 * @role controller
 * @owns Today practice list refresh, add/remove behavior, and ordered item persistence
 * @not-owns activity CRUD, practice execution, or DOM rendering
 * @notes This controller is scaffolded so Today-list work can land incrementally.
 */

import { state } from "../../app/state.js";
import {
  addTodayListItem,
  deleteTodayListItem,
  getTodayListByProfile,
  updateTodayListItem,
} from "../../persistence/today-list-store.js";

export function createTodayListController({ handleError } = {}) {
  async function refreshTodayList() {
    if (!state.currentProfileId) {
      state.todayListItems = [];
      return [];
    }

    const items = await getTodayListByProfile(state.currentProfileId);
    state.todayListItems = items;
    return items;
  }

  async function addActivityToTodayList(activityId) {
    try {
      const nextOrder =
        state.todayListItems.reduce((max, item) => Math.max(max, item.sortOrder ?? 0), -1) + 1;

      const itemId = await addTodayListItem({
        profileId: state.currentProfileId,
        activityId,
        sortOrder: nextOrder,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await refreshTodayList();
      return itemId;
    } catch (error) {
      handleError?.(error);
      return null;
    }
  }

  async function removeTodayListItem(itemId) {
    try {
      await deleteTodayListItem(itemId);
      await refreshTodayList();
    } catch (error) {
      handleError?.(error);
    }
  }

  async function moveTodayListItem(itemId, targetIndex) {
    try {
      const items = [...state.todayListItems];
      const currentIndex = items.findIndex((item) => item.id === itemId);

      if (currentIndex === -1 || targetIndex < 0 || targetIndex >= items.length) {
        return;
      }

      const [moved] = items.splice(currentIndex, 1);
      items.splice(targetIndex, 0, moved);

      await Promise.all(
        items.map((item, index) =>
          updateTodayListItem({
            ...item,
            sortOrder: index,
            updatedAt: Date.now(),
          }),
        ),
      );

      await refreshTodayList();
    } catch (error) {
      handleError?.(error);
    }
  }

  return {
    refreshTodayList,
    addActivityToTodayList,
    removeTodayListItem,
    moveTodayListItem,
  };
}