from rest_framework import serializers
from .models import Song, Artist, PlaylistSong, UserPlaylist


class ArtistSerializer(serializers.ModelSerializer):
    class Meta:
        model = Artist
        fields = "__all__"


class SongSerializer(serializers.ModelSerializer):
    artist = ArtistSerializer(read_only=True)

    class Meta:
        model = Song
        fields = ("song_title", "artist", "album", "duration", "isrc", "image_url", "spotify_uri")


class PlaylistSongSerializer(serializers.ModelSerializer):
    song = SongSerializer(read_only=True)

    class Meta:
        model = PlaylistSong
        fields = ("song",)


# Difference between User and Recommended serializers is that UserPlaylistSerializer doesn't send back
# serialized Songs since there's no use for them in the frontend.
class UserPlaylistSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserPlaylist
        fields = ("spotify_id", "playlist_name", "image_url")


class RecommendedPlaylistSerializer(serializers.ModelSerializer):
    playlist_songs = PlaylistSongSerializer(read_only=True, many=True)

    class Meta:
        model = UserPlaylist
        fields = ("id", "playlist_name", "playlist_songs", "image_url")
