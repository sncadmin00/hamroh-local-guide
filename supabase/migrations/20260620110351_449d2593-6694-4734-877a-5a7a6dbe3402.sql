
CREATE TABLE public.wishlist_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '❤️',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_collections TO authenticated;
GRANT ALL ON public.wishlist_collections TO service_role;

ALTER TABLE public.wishlist_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own collections"
  ON public.wishlist_collections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
  ON public.wishlist_collections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
  ON public.wishlist_collections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
  ON public.wishlist_collections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_wishlist_collections_user_id ON public.wishlist_collections(user_id);

-- Extend wishlists
ALTER TABLE public.wishlists
  ADD COLUMN collection_id uuid REFERENCES public.wishlist_collections(id) ON DELETE SET NULL;

CREATE INDEX idx_wishlists_collection_id ON public.wishlists(collection_id);

-- Update item_type CHECK constraint if present
DO $$
DECLARE
  v_conname text;
BEGIN
  SELECT conname INTO v_conname
  FROM pg_constraint
  WHERE conrelid = 'public.wishlists'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) ILIKE '%item_type%';

  IF v_conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.wishlists DROP CONSTRAINT %I', v_conname);
  END IF;
END $$;

ALTER TABLE public.wishlists
  ADD CONSTRAINT wishlists_item_type_check
  CHECK (item_type IN ('guide','tour','city','place','article','spotlight'));
