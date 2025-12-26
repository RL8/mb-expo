import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

// Use service role key to bypass RLS for admin updates
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Featured artists to add
const FEATURED_ARTISTS_TO_ADD = {
  'Breathe': ['Colbie Caillat'],
  'You All Over Me': ['Maren Morris'],
  'That\'s When': ['Keith Urban'],
  'The Last Time': ['Gary Lightbody'],
  'Everything Has Changed': ['Ed Sheeran'],
  'Nothing New': ['Phoebe Bridgers'],
  'Run': ['Ed Sheeran'],
  'I Bet You Think About Me': ['Chris Stapleton'],
  'Bad Blood': ['Kendrick Lamar'],
  'End Game': ['Ed Sheeran', 'Future'],
  'Me!': ['Brendon Urie'],
  'Soon You\'ll Get Better': ['The Chicks'],
  'Exile': ['Bon Iver'],
  'No Body, No Crime': ['HAIM'],
  'Coney Island': ['The National'],
  'Evermore': ['Bon Iver'],
  'Electric Touch': ['Fall Out Boy'],
  'Castles Crumbling': ['Hayley Williams'],
  'Snow on the Beach': ['Lana Del Rey'],
  'Snow On The Beach (Feat. More Lana Del Rey)': ['Lana Del Rey'],
  'Fortnight': ['Post Malone'],
  'Florida!!!': ['Florence + The Machine'],
};

// Songs where Taylor Swift needs to be removed from co_writers
const REMOVE_TS_FROM_COWRITERS = [
  'Snow on the Beach',
  'All Too Well',
  'Forever & Always (Piano Version)',
  'Treacherous (Original Demo Recording)',
];

// Showgirl album co-writers (all tracks have Max Martin & Shellback)
const SHOWGIRL_COWRITERS = {
  'The Fate Of Ophelia': ['Max Martin', 'Shellback'],
  'Elizabeth Taylor': ['Max Martin', 'Shellback'],
  'Opalite': ['Max Martin', 'Shellback'],
  'Father Figure': ['Max Martin', 'Shellback', 'George Michael'],
  'Eldest Daughter': ['Max Martin', 'Shellback'],
  'Ruin The Friendship': ['Max Martin', 'Shellback'],
  'Actually Romantic': ['Max Martin', 'Shellback'],
  'Wi$hLi$t': ['Max Martin', 'Shellback'],
  'Wood': ['Max Martin', 'Shellback'],
  'Cancelled!': ['Max Martin', 'Shellback'],
  'Honey': ['Max Martin', 'Shellback'],
  'The Life Of A Showgirl': ['Max Martin', 'Shellback'],
};

// Showgirl featured artist
const SHOWGIRL_FEATURED = {
  'The Life Of A Showgirl': ['Sabrina Carpenter'],
};

async function fixCredits() {
  const { data: songs, error } = await supabase
    .from('songs')
    .select('id, title, features');

  if (error) {
    console.error('Error fetching songs:', error);
    return;
  }

  console.log('='.repeat(60));
  console.log('STEP 1: Adding featured_artists');
  console.log('='.repeat(60));

  let featuredUpdates = 0;
  for (const [targetTitle, artists] of Object.entries(FEATURED_ARTISTS_TO_ADD)) {
    const song = songs.find(s =>
      s.title.toLowerCase() === targetTitle.toLowerCase()
    );

    if (song) {
      const currentFeatures = song.features || {};
      const updatedFeatures = {
        ...currentFeatures,
        featured_artists: artists,
      };

      const { error: updateError } = await supabase
        .from('songs')
        .update({ features: updatedFeatures })
        .eq('id', song.id);

      if (updateError) {
        console.log(`❌ Failed: "${song.title}" - ${updateError.message}`);
      } else {
        console.log(`✅ Updated: "${song.title}" → feat. ${artists.join(', ')}`);
        featuredUpdates++;
      }
    } else {
      console.log(`⚠️  Not found: "${targetTitle}"`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('STEP 2: Removing Taylor Swift from co_writers');
  console.log('='.repeat(60));

  let cowriterFixes = 0;
  for (const targetTitle of REMOVE_TS_FROM_COWRITERS) {
    const song = songs.find(s =>
      s.title.toLowerCase() === targetTitle.toLowerCase()
    );

    if (song) {
      const currentFeatures = song.features || {};
      const currentCoWriters = currentFeatures.co_writers || [];

      // Filter out Taylor Swift
      const filteredCoWriters = currentCoWriters.filter(w =>
        !w.toLowerCase().includes('taylor swift')
      );

      if (filteredCoWriters.length !== currentCoWriters.length) {
        const updatedFeatures = {
          ...currentFeatures,
          co_writers: filteredCoWriters,
        };

        const { error: updateError } = await supabase
          .from('songs')
          .update({ features: updatedFeatures })
          .eq('id', song.id);

        if (updateError) {
          console.log(`❌ Failed: "${song.title}" - ${updateError.message}`);
        } else {
          console.log(`✅ Fixed: "${song.title}"`);
          console.log(`   Before: ${currentCoWriters.join(', ')}`);
          console.log(`   After:  ${filteredCoWriters.length > 0 ? filteredCoWriters.join(', ') : '(solo)'}`);
          cowriterFixes++;
        }
      }
    } else {
      console.log(`⚠️  Not found: "${targetTitle}"`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('STEP 3: Updating Showgirl album credits');
  console.log('='.repeat(60));

  let showgirlUpdates = 0;
  for (const [targetTitle, coWriters] of Object.entries(SHOWGIRL_COWRITERS)) {
    const song = songs.find(s =>
      s.title.toLowerCase() === targetTitle.toLowerCase()
    );

    if (song) {
      const currentFeatures = song.features || {};
      const featuredArtists = SHOWGIRL_FEATURED[targetTitle] || [];

      const updatedFeatures = {
        ...currentFeatures,
        co_writers: coWriters,
      };

      if (featuredArtists.length > 0) {
        updatedFeatures.featured_artists = featuredArtists;
      }

      const { error: updateError } = await supabase
        .from('songs')
        .update({ features: updatedFeatures })
        .eq('id', song.id);

      if (updateError) {
        console.log(`❌ Failed: "${song.title}" - ${updateError.message}`);
      } else {
        const featStr = featuredArtists.length > 0 ? ` (feat. ${featuredArtists.join(', ')})` : '';
        console.log(`✅ Updated: "${song.title}"${featStr}`);
        console.log(`   Co-writers: ${coWriters.join(', ')}`);
        showgirlUpdates++;
      }
    } else {
      console.log(`⚠️  Not found: "${targetTitle}"`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Featured artists added: ${featuredUpdates}`);
  console.log(`Co-writer entries fixed: ${cowriterFixes}`);
  console.log(`Showgirl tracks updated: ${showgirlUpdates}`);
}

fixCredits();
