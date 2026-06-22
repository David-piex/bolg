ALTER TABLE site_settings ADD COLUMN logo_image_id UUID;
ALTER TABLE site_settings ADD CONSTRAINT fk_site_settings_logo_image FOREIGN KEY (logo_image_id) REFERENCES media_assets(id) ON DELETE SET NULL;
