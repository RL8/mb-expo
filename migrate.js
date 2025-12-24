const { createClient } = require('@supabase/supabase-js');

// Old instance (source)
const oldSupabase = createClient(
  'https://gyiiblmvmdhvtbvsqcbl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd5aWlibG12bWRodnRidnNxY2JsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NTI2NDk0MCwiZXhwIjoyMDcwODQwOTQwfQ.HuVyM5kwUgPaYrPhg5TBXbCVAxHjEOFIS4rzZF_AmeE'
);

// New instance (destination)
const newSupabase = createClient(
  'https://ugordixhssicxkahczbf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVnb3JkaXhoc3NpY3hrYWhjemJmIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjU0MTAyMywiZXhwIjoyMDgyMTE3MDIzfQ.yPofitVq75uvyIV6kviBVXuaWVMt0OWdqiGGkliRgdg'
);

async function migrate() {
  console.log('Starting migration...\n');

  // 1. Fetch albums from old instance
  console.log('Fetching albums from old instance...');
  const { data: albums, error: albumsError } = await oldSupabase
    .from('albums')
    .select('*');

  if (albumsError) {
    console.error('Error fetching albums:', albumsError);
    return;
  }
  console.log(`Found ${albums.length} albums\n`);

  // 2. Fetch songs from old instance
  console.log('Fetching songs from old instance...');
  const { data: songs, error: songsError } = await oldSupabase
    .from('songs')
    .select('*');

  if (songsError) {
    console.error('Error fetching songs:', songsError);
    return;
  }
  console.log(`Found ${songs.length} songs\n`);

  // 3. Insert albums into new instance
  console.log('Inserting albums into new instance...');
  const { error: insertAlbumsError } = await newSupabase
    .from('albums')
    .upsert(albums, { onConflict: 'id' });

  if (insertAlbumsError) {
    console.error('Error inserting albums:', insertAlbumsError);
    console.log('\nYou may need to create tables first. Run this SQL in the new project:');
    console.log('https://supabase.com/dashboard/project/ugordixhssicxkahczbf/sql/new\n');
    printSchema();
    return;
  }
  console.log('Albums inserted successfully!\n');

  // 4. Insert songs into new instance
  console.log('Inserting songs into new instance...');
  const { error: insertSongsError } = await newSupabase
    .from('songs')
    .upsert(songs, { onConflict: 'id' });

  if (insertSongsError) {
    console.error('Error inserting songs:', insertSongsError);
    return;
  }
  console.log('Songs inserted successfully!\n');

  console.log('Migration complete!');
}

function printSchema() {
  console.log(`
-- Run this SQL in the new Supabase project first:

CREATE TABLE albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT,
  release_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  album_id UUID REFERENCES albums(id),
  track_number INTEGER,
  duration_minutes NUMERIC,
  word_count INTEGER,
  unique_word_count INTEGER,
  from_the_vault BOOLEAN DEFAULT FALSE,
  audio_features JSONB,
  mood_profile JSONB,
  themes JSONB,
  features TEXT[],
  narrative_voice TEXT,
  narrative_character_count INTEGER,
  raw_lyrics_searchable TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT,
  plan_type TEXT,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON albums FOR SELECT USING (true);
CREATE POLICY "Public read access" ON songs FOR SELECT USING (true);
`);
}

migrate().catch(console.error);
