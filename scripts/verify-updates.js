import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function verify() {
  // Check a few specific songs
  const testSongs = [
    'Breathe',
    'End Game',
    'Exile',
    'Fortnight',
    'The Life Of A Showgirl',
    'All Too Well',
  ];

  console.log('Verifying database updates...\n');

  for (const title of testSongs) {
    const { data, error } = await supabase
      .from('songs')
      .select('title, features')
      .ilike('title', title)
      .limit(1);

    if (error) {
      console.log(`❌ Error fetching "${title}": ${error.message}`);
    } else if (data && data.length > 0) {
      const song = data[0];
      console.log(`"${song.title}":`);
      console.log(`  co_writers: ${JSON.stringify(song.features?.co_writers || [])}`);
      console.log(`  featured_artists: ${JSON.stringify(song.features?.featured_artists || [])}`);
      console.log('');
    } else {
      console.log(`⚠️ Not found: "${title}"`);
    }
  }
}

verify();
