const PROGRESSION_QUERY_KEYS = [
  ["hunter"],
  ["quests"],
  ["quest-history"],
  ["goals"],
  ["habits"],
  ["habit-stats"],
  ["focus-active"],
  ["focus-history"],
  ["focus-skill"],
  ["stats"],
  ["analytics-dashboard"],
  ["analytics-trends"],
  ["analytics-heatmap"],
  ["analytics-predictions"],
  ["stat-history"],
  ["calendar-quests-today"],
  ["calendar-quests-history"],
  ["notifications"],
  ["notifications-badge"],
  ["ai-next-action"],
  ["achievements"],
];

export const syncProgressionQueries = (queryClient) =>
  Promise.all(
    PROGRESSION_QUERY_KEYS.map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
