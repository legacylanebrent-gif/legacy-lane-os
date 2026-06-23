// Shared category definitions for the Cool Finds blog
// Used by CoolFindsSubmit, CoolFindsBlog, CoolFindsDetail, and AdminCoolFinds

export const COOL_FIND_CATEGORIES = [
  { key: 'what_is_this', label: 'What is This?', color: 'bg-amber-100 text-amber-700' },
  { key: 'mystery_solved', label: 'Mystery Solved!', color: 'bg-green-100 text-green-700' },
  { key: 'hidden_treasures', label: 'Hidden Treasures', color: 'bg-cyan-100 text-cyan-700' },
  { key: 'rare_finds', label: 'Rare Finds', color: 'bg-indigo-100 text-indigo-700' },
  { key: 'strange_discoveries', label: 'Strange Discoveries', color: 'bg-purple-100 text-purple-700' },
  { key: 'forgotten_history', label: 'Forgotten History', color: 'bg-stone-100 text-stone-700' },
  { key: 'vintage_collectibles', label: 'Vintage Collectibles', color: 'bg-orange-100 text-orange-700' },
  { key: 'family_heirlooms', label: 'Family Heirlooms', color: 'bg-rose-100 text-rose-700' },
  { key: 'amazing_attic_finds', label: 'Amazing Attic Finds', color: 'bg-yellow-100 text-yellow-700' },
  { key: 'behind_the_walls', label: 'Behind the Walls', color: 'bg-slate-100 text-slate-700' },
  { key: 'incredible_garage_finds', label: 'Incredible Garage Finds', color: 'bg-blue-100 text-blue-700' },
  { key: 'weird_things_found', label: 'Weird Things I\'ve Found', color: 'bg-fuchsia-100 text-fuchsia-700' },
  { key: 'most_valuable_discoveries', label: 'Most Valuable Discoveries', color: 'bg-emerald-100 text-emerald-700' },
  { key: 'antique_mysteries', label: 'Antique Mysteries', color: 'bg-teal-100 text-teal-700' },
  { key: 'nostalgic_finds', label: 'Nostalgic Finds', color: 'bg-pink-100 text-pink-700' },
  { key: 'lost_treasures', label: 'Lost Treasures', color: 'bg-violet-100 text-violet-700' },
  { key: 'historical_artifacts', label: 'Historical Artifacts', color: 'bg-brown-100 text-amber-800' },
];

export const getCategoryLabel = (key) => {
  const cat = COOL_FIND_CATEGORIES.find(c => c.key === key);
  return cat?.label || key;
};

export const getCategoryColor = (key) => {
  const cat = COOL_FIND_CATEGORIES.find(c => c.key === key);
  return cat?.color || 'bg-slate-100 text-slate-700';
};