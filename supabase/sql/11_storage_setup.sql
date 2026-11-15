-- ============================================================================
-- HOTEL SPARK / HAIP – SUPABASE SQL MIGRATION
-- 11_storage_setup.sql: Supabase Storage Buckets & Access Policies
-- ============================================================================

-- Create Storage Buckets if storage schema exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- 1. Public bucket for hotel logos, banners, branding assets
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'hotel-assets',
      'hotel-assets',
      true,
      10485760, -- 10MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 10485760;

    -- 2. Public bucket for room photos & gallery
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'room-photos',
      'room-photos',
      true,
      15728640, -- 15MB
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = true,
      file_size_limit = 15728640;

    -- 3. Private bucket for Guest Documents (Government IDs, Passports, Aadhaar)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'guest-documents',
      'guest-documents',
      false, -- Private bucket
      20971520, -- 20MB
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = 20971520;
  END IF;
END $$;

-- Storage Policies (Active when Supabase storage is initialized)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'storage' AND tablename = 'objects') THEN

    -- hotel-assets public read
    DROP POLICY IF EXISTS "Public can view hotel assets" ON storage.objects;
    CREATE POLICY "Public can view hotel assets"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'hotel-assets');

    -- room-photos public read
    DROP POLICY IF EXISTS "Public can view room photos" ON storage.objects;
    CREATE POLICY "Public can view room photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'room-photos');

    -- staff can upload to hotel-assets and room-photos
    DROP POLICY IF EXISTS "Staff can upload hotel media" ON storage.objects;
    CREATE POLICY "Staff can upload hotel media"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id IN ('hotel-assets', 'room-photos')
        AND auth.role() = 'authenticated'
      );

    -- guest-documents: only authenticated staff can view and upload
    DROP POLICY IF EXISTS "Staff can view guest documents" ON storage.objects;
    CREATE POLICY "Staff can view guest documents"
      ON storage.objects FOR SELECT
      USING (
        bucket_id = 'guest-documents'
        AND auth.role() = 'authenticated'
      );

    DROP POLICY IF EXISTS "Staff can upload guest documents" ON storage.objects;
    CREATE POLICY "Staff can upload guest documents"
      ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'guest-documents'
        AND auth.role() = 'authenticated'
      );

  END IF;
END $$;
