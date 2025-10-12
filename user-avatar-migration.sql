-- Add card-based avatar support to user profiles
-- This allows users to select a card image as their avatar with custom cropping

ALTER TABLE user_profiles 
ADD COLUMN avatar_card_id INTEGER,
ADD COLUMN avatar_crop_data JSONB;

-- Optional: Add a comment explaining the avatar_crop_data structure
COMMENT ON COLUMN user_profiles.avatar_crop_data IS 'JSON object with x, y, scale properties for cropping card image as avatar';

-- Example avatar_crop_data structure:
-- {
--   "x": 50,    -- horizontal position percentage (0-100)
--   "y": 30,    -- vertical position percentage (0-100) 
--   "scale": 1.5 -- zoom scale (typically 1.0-3.0)
-- }