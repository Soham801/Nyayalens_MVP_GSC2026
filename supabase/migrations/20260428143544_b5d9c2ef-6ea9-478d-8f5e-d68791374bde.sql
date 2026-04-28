
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS "Public read artisan-works" ON storage.objects;
-- Allow direct object reads (needed for public image URLs in certificates) but no listing
CREATE POLICY "Public read artisan-works objects" ON storage.objects FOR SELECT
  USING (bucket_id = 'artisan-works');
