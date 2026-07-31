-- Providers that can be listed by link but never connected.
--
-- Amazon Music publishes no third-party API for reading playlists and no oEmbed
-- endpoint -- its playlist pages redirect non-browser clients to a stub with no
-- metadata at all -- so nothing about it can be automated. OTHER covers every
-- service after it (Apple Music, Tidal, SoundCloud, Bandcamp) on the same terms.
--
-- ADD VALUE is append-only and cannot be reversed without recreating the type,
-- so a down migration would have to rewrite every Playlist row. It is also
-- transaction-safe to *add* a value on PostgreSQL 12+ provided nothing uses it
-- in the same transaction, which nothing here does.
ALTER TYPE "MusicProvider" ADD VALUE 'AMAZON';
ALTER TYPE "MusicProvider" ADD VALUE 'OTHER';
