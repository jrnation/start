-- Copy and paste this directly into the Cloudflare D1 Console

CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    displayName TEXT,
    email TEXT,
    photoUrl TEXT,
    totalScore INTEGER DEFAULT 0,
    totalQuestions INTEGER DEFAULT 0,
    currentStreak INTEGER DEFAULT 0,
    lastActiveDate TEXT -- Format: YYYY-MM-DD
);

-- Optional: Create an index on totalScore for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_totalScore ON users(totalScore DESC);
