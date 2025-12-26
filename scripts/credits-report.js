import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function generateReport() {
  const { data: albums } = await supabase
    .from('albums')
    .select('id, display_name')
    .order('official_release_date', { ascending: true });

  const { data: songs } = await supabase
    .from('songs')
    .select('title, album_id, track_number, features')
    .order('track_number', { ascending: true });

  console.log('='.repeat(60));
  console.log('CREDITS REPORT: Co-writers & Featured Artists');
  console.log('='.repeat(60));

  let totalSongs = 0;
  let songsWithCoWriters = 0;
  let songsWithFeatured = 0;

  for (const album of albums) {
    const albumSongs = songs.filter(s => s.album_id === album.id);
    if (albumSongs.length === 0) continue;

    console.log(`\n## ${album.display_name}`);
    console.log('-'.repeat(40));

    for (const song of albumSongs) {
      totalSongs++;
      const coWriters = song.features?.co_writers || [];
      const featured = song.features?.featured_artists || [];

      if (coWriters.length > 0) songsWithCoWriters++;
      if (featured.length > 0) songsWithFeatured++;

      const coWriterStr = coWriters.length > 0 ? coWriters.join(', ') : '(solo)';
      const featuredStr = featured.length > 0 ? ` (feat. ${featured.join(', ')})` : '';

      console.log(`${song.track_number}. ${song.title}${featuredStr}`);
      console.log(`   Writers: Taylor Swift${coWriters.length > 0 ? ', ' + coWriterStr : ''}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total songs: ${totalSongs}`);
  console.log(`Songs with co-writers: ${songsWithCoWriters} (${Math.round(songsWithCoWriters/totalSongs*100)}%)`);
  console.log(`Songs with featured artists: ${songsWithFeatured} (${Math.round(songsWithFeatured/totalSongs*100)}%)`);
}

generateReport();
