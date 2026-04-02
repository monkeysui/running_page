// Marathon race metadata
// Key: run_id, Value: { name (optional override), url (optional blog link) }
// Name auto-generates as "年份+城市+马拉松" from location data when not set here
const raceMetadata: Record<number, { name?: string; url?: string }> = {
  12697560113: {
    name: '2024潍坊马拉松',
    url: 'https://monkeys.cafe/marathon-3-weifang-2024/',
  },
  10203158093: {
    url: 'https://monkeys.cafe/marathon-2-taian-2023/',
  },
  445089836: {
    name: '2015广州马拉松',
  },
};

// Run IDs to exclude from marathon records (e.g. hiking that happens to be 42km+)
export const raceExcludeIds = new Set<number>([
  14420340648, // 五台山轻装
]);

export default raceMetadata;
