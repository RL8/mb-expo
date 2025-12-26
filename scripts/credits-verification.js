import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

// DEFINITIVE LIST: Featured Artists (from Taylor Swift Wiki + official sources)
const FEATURED_ARTISTS = {
  // Fearless
  'Breathe': ['Colbie Caillat'],
  'You All Over Me': ['Maren Morris'],
  'That\'s When': ['Keith Urban'],

  // Red
  'The Last Time': ['Gary Lightbody'],
  'Everything Has Changed': ['Ed Sheeran'],
  'Nothing New': ['Phoebe Bridgers'],
  'Run': ['Ed Sheeran'],
  'I Bet You Think About Me': ['Chris Stapleton'],

  // 1989
  'Bad Blood': ['Kendrick Lamar'], // remix version

  // Reputation
  'End Game': ['Ed Sheeran', 'Future'],

  // Lover
  'ME!': ['Brendon Urie'],
  'Soon You\'ll Get Better': ['The Chicks'],

  // folklore
  'Exile': ['Bon Iver'],

  // evermore
  'No Body, No Crime': ['HAIM'],
  'Coney Island': ['The National'],
  'Evermore': ['Bon Iver'],

  // Speak Now TV
  'Electric Touch': ['Fall Out Boy'],
  'Castles Crumbling': ['Hayley Williams'],

  // Midnights
  'Snow On The Beach': ['Lana Del Rey'],
  'Snow On The Beach (Feat. More Lana Del Rey)': ['Lana Del Rey'],
  'Karma': ['Ice Spice'], // remix

  // TTPD
  'Fortnight': ['Post Malone'],
  'Florida!!!': ['Florence + The Machine'],
};

// DEFINITIVE LIST: Songs Taylor wrote SOLO (no co-writers)
const SOLO_WRITTEN = [
  // Debut
  'The Outside', 'Should\'ve Said No', 'Our Song', 'Mary\'s Song (Oh My My My)',

  // Fearless
  'Fifteen', 'Love Story', 'Hey Stephen', 'You\'re Not Sorry', 'Forever & Always',
  'The Best Day', 'Change', 'Jump Then Fall', 'The Other Side Of The Door',
  'Today Was A Fairytale', 'Mr. Perfectly Fine',

  // Speak Now (entire album written solo)
  'Mine', 'Sparks Fly', 'Back To December', 'Speak Now', 'Dear John', 'Mean',
  'The Story Of Us', 'Never Grow Up', 'Enchanted', 'Better Than Revenge',
  'Innocent', 'Haunted', 'Last Kiss', 'Long Live', 'Ours', 'Superman',
  'Electric Touch', 'When Emma Falls In Love', 'I Can See You', 'Castles Crumbling',
  'Foolish One', 'Timeless',

  // Red
  'State Of Grace', 'Red', 'I Almost Do', 'Stay Stay Stay', 'Holy Ground',
  'Sad Beautiful Tragic', 'The Lucky One', 'Starlight', 'Begin Again',
  'The Moment I Knew', 'Girl At Home', 'Better Man', 'Nothing New', 'Babe',
  'All Too Well (10 Minute Version)',

  // 1989
  'This Love',

  // Lover
  'Lover', 'Miss Americana & The Heartbreak Prince', 'Cornelia Street', 'Daylight',

  // folklore
  'My Tears Ricochet',

  // evermore
  'No Body, No Crime', 'Right Where You Left Me', 'It\'s Time To Go',

  // Midnights
  'Vigilante Shit', 'Bigger Than The Whole Sky',

  // TTPD
  'My Boy Only Breaks His Favorite Toys', 'Who\'s Afraid Of Little Old Me?',
  'I Can Fix Him (No Really I Can)', 'I Can Do It With A Broken Heart',
  'The Smallest Man Who Ever Lived', 'The Black Dog',
  'Chloe Or Sam Or Sophia Or Marcus', 'Peter', 'The Manuscript',
];

async function verify() {
  const { data: albums } = await supabase
    .from('albums')
    .select('id, display_name')
    .order('official_release_date', { ascending: true });

  const { data: songs } = await supabase
    .from('songs')
    .select('title, album_id, track_number, features')
    .order('track_number', { ascending: true });

  console.log('='.repeat(70));
  console.log('PART 1: FEATURED ARTISTS - DEFINITIVE LIST');
  console.log('='.repeat(70));

  for (const [song, artists] of Object.entries(FEATURED_ARTISTS)) {
    console.log(`• ${song} — feat. ${artists.join(', ')}`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('PART 2: FEATURED ARTISTS - DATABASE GAPS');
  console.log('='.repeat(70));

  let featuredMissing = 0;
  for (const [songTitle, artists] of Object.entries(FEATURED_ARTISTS)) {
    const dbSong = songs.find(s =>
      s.title.toLowerCase() === songTitle.toLowerCase() ||
      s.title.toLowerCase().includes(songTitle.toLowerCase())
    );

    if (dbSong) {
      const dbFeatured = dbSong.features?.featured_artists || [];
      if (dbFeatured.length === 0) {
        featuredMissing++;
        console.log(`❌ MISSING: "${dbSong.title}" needs feat. ${artists.join(', ')}`);
      }
    } else {
      console.log(`⚠️  NOT IN DB: "${songTitle}"`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('PART 3: CO-WRITER VERIFICATION');
  console.log('='.repeat(70));

  let cowriterIssues = [];

  for (const song of songs) {
    const album = albums.find(a => a.id === song.album_id);
    const dbCoWriters = song.features?.co_writers || [];
    const isSoloWritten = SOLO_WRITTEN.some(s =>
      s.toLowerCase() === song.title.toLowerCase()
    );

    // Check for mismatches
    if (isSoloWritten && dbCoWriters.length > 0) {
      // DB says has co-writers, but should be solo
      cowriterIssues.push({
        song: song.title,
        album: album?.display_name,
        issue: 'SHOULD BE SOLO',
        current: dbCoWriters.join(', '),
      });
    } else if (!isSoloWritten && dbCoWriters.length === 0) {
      // DB says solo, but should have co-writers (excluding Speak Now which is all solo)
      const isSpeakNow = album?.display_name === 'Speak Now';
      if (!isSpeakNow) {
        cowriterIssues.push({
          song: song.title,
          album: album?.display_name,
          issue: 'MISSING CO-WRITERS',
          current: '(none)',
        });
      }
    }

    // Check for Taylor Swift listed as co-writer (she's always the PRIMARY writer)
    if (dbCoWriters.some(w => w.toLowerCase().includes('taylor swift'))) {
      cowriterIssues.push({
        song: song.title,
        album: album?.display_name,
        issue: 'TS IN CO-WRITERS (redundant)',
        current: dbCoWriters.join(', '),
      });
    }
  }

  if (cowriterIssues.length > 0) {
    console.log('\nIssues found:\n');
    for (const issue of cowriterIssues) {
      console.log(`❌ [${issue.album}] "${issue.song}"`);
      console.log(`   Issue: ${issue.issue}`);
      console.log(`   Current: ${issue.current}\n`);
    }
  } else {
    console.log('✅ No co-writer issues found');
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Featured artists missing: ${featuredMissing}`);
  console.log(`Co-writer issues: ${cowriterIssues.length}`);

  console.log('\n' + '='.repeat(70));
  console.log('RECOMMENDATION: DATA MODEL');
  console.log('='.repeat(70));
  console.log(`
Current model:
  features: { co_writers: ["Name1", "Name2"] }

Taylor Swift is ALWAYS the primary writer on every song.
The "co_writers" field correctly represents OTHER writers.

You do NOT need a "co_writer yes/no" column because:
  - If co_writers is empty → Taylor wrote it solo
  - If co_writers has names → Taylor + those people wrote it

RECOMMENDED: Add featured_artists to the features object:
  features: {
    co_writers: ["Aaron Dessner"],
    featured_artists: ["Bon Iver"]
  }
`);
}

verify();
