from django.db import models
from accounts.models import CustomUser, UserSpotifyProfile

import re
import os

import requests
import aiohttp

import ffmpeg
import imageio_ffmpeg

from requests.utils import requote_uri
from io import BytesIO


class Artist(models.Model):
    artist_name = models.CharField(max_length=200)
    spotify_id = models.CharField(max_length=200, primary_key=True)

    def __str__(self):
        return self.artist_name

    def get_top_n_songs(self, spotify_profile, n: int = 40):
        """Returns the top <n> songs by their respective identifying ISRC codes."""

        spotify_api_url = (
            f"https://api.spotify.com/v1/artists/{self.spotify_id}/top-tracks"
        )

        headers = {"Authorization": f"Bearer {spotify_profile.access_token}"}

        response = requests.get(url=spotify_api_url, headers=headers)

        if response.status_code == 401:
            return {"reauth_required": True, "status_code": response.status_code}
        elif response.status_code != 200:
            return {"reauth_required": False, "status_code": response.status_code}

        track_list = []

        for track in response.json()["tracks"][:n]:

            if track["is_local"]:
                continue

            try:
                image_url = track["album"]["images"][0]["url"]
            except KeyError or IndexError:
                image_url = ""

            track_data = {
                "title": track["name"],
                "artist": self,
                "album": track["album"]["name"],
                "image_url": image_url,
                "duration": track["duration_ms"],
                "isrc": track["external_ids"]["isrc"],
                "spotify_uri": track["uri"],
            }

            track_list.append(track_data)

        return {"tracks": track_list, "reauth_required": False, "status_code": 200}


class SongAnalysis(models.Model):
    # ReccoBeats Analysis Features
    acousticness = models.FloatField()
    danceability = models.FloatField()
    energy = models.FloatField()
    instrumentalness = models.FloatField()
    liveness = models.FloatField()
    loudness = models.FloatField()
    speechiness = models.FloatField()
    tempo = models.FloatField()
    valence = models.FloatField()

    def to_list(self):
        return [self.acousticness, self.danceability, self.energy, self.instrumentalness,
                self.liveness, self.loudness, self.speechiness, self.tempo, self.valence]


class Song(models.Model):
    song_title = models.CharField(max_length=200)
    artist = models.ForeignKey(Artist, null=True, on_delete=models.SET_NULL)
    album = models.CharField(blank=True)
    duration = models.PositiveIntegerField(default=0)  # in milliseconds
    isrc = models.CharField(max_length=200, primary_key=True)
    spotify_uri = models.CharField(max_length=300, blank=True)
    image_url = models.URLField(blank=True)

    analysis = models.ForeignKey(SongAnalysis, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.song_title

    def get_deezer_preview(self) -> str | None:
        base_url = "https://api.deezer.com/track/"
        query = requote_uri(f"isrc:{self.isrc}")
        deezer_url = base_url + query

        response = requests.get(deezer_url)
        response.raise_for_status()
        data = response.json()

        items = data.get("preview", {})

        if items:
            return items

        return None

    def reencode_preview_url(self) -> BytesIO:
        # Add imageio-ffmpeg binary to PATH
        os.environ["PATH"] = (
                os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
                + os.pathsep
                + os.environ["PATH"]
        )

        preview_url = self.get_deezer_preview()

        if not preview_url:
            raise ValueError("No preview URL available from Deezer!")

        # Download preview into variable
        response = requests.get(preview_url)
        if (
                response.status_code != 200
        ):  # Raise ValueError if preview could not be downloaded from the url
            raise ValueError("Failed to download preview")

        preview_bytes = BytesIO(
            response.content
        )  # Keep response in memory with BytesIO; avoid writing to disk (no .mp3 files)

        # Re-encode using ffmpeg-python; fixes bit-rate issue from Deezer previews
        process = (
            ffmpeg.input("pipe:0")
            .output("pipe:1", format="mp3", audio_bitrate="192k", ac=2, ar=44100)
            .run_async(pipe_stdin=True, pipe_stdout=True, pipe_stderr=True)
        )

        out, err = process.communicate(
            input=preview_bytes.read()
        )  # out: output from process; err: possible errors from process

        if process.returncode != 0:
            raise RuntimeError("ffmpeg failed:\n" + err.decode())

        result = BytesIO(out)  # Final fixed preview with enhanced bitrate
        result.seek(0)
        return result

    def set_song_analysis(self):

        if self.analysis:
            return 200, self.analysis.to_list()

        # else:
        reccobeats_url = "https://api.reccobeats.com/v1/analysis/audio-features"

        try:
            song_data = self.reencode_preview_url()

            files = {
                "audioFile": (
                    "preview.mp3",  # filename
                    song_data,  # file content (bytes or file-like object)
                    "audio/mpeg"  # MIME type
                )
            }

            headers = {"Accept": "application/json"}

            analysis = requests.post(url=reccobeats_url, headers=headers, files=files)
            print(analysis.text)
            print(analysis.status_code)

            if analysis.status_code not in {200, 429}:
                print("ReccoBeats Analysis Error; Song Skipped.")
                return None
            else:
                data = analysis.json()

                if analysis.status_code == 200:
                    song_analysis, created = SongAnalysis.objects.get_or_create(
                        acousticness=data["acousticness"],
                        danceability=data["danceability"],
                        energy=data["energy"],
                        instrumentalness=data["instrumentalness"],
                        liveness=data["liveness"],
                        loudness=data["loudness"],
                        speechiness=data["speechiness"],
                        tempo=data["tempo"],
                        valence=data["valence"]
                    )

                    self.analysis = song_analysis
                    self.save()

                return analysis.status_code, self.analysis.to_list()

        except ValueError as e:
            print("No Preview URL Found; Song skipped")
            print(e)
            return None


class UserPlaylist(models.Model):
    id = models.AutoField(primary_key=True)
    spotify_id = models.CharField(max_length=300, blank=True)
    spotify_user = models.ForeignKey(UserSpotifyProfile, on_delete=models.CASCADE, related_name="user_playlists")
    playlist_name = models.CharField(max_length=200)
    songs = models.ManyToManyField(Song, through="PlaylistSong")
    image_url = models.URLField(blank=True)

    def __str__(self):
        return self.playlist_name

    def set_playlist_analysis(self):
        return run_analysis(self.songs.all())


def run_analysis(song_collection, remove_failures: bool = False):
    feature_vectors = []
    songs_to_remove = []

    for song in song_collection:
        print(f"Analysing: {song.song_title}")
        print(f"::::{song}::::")
        result = song.set_song_analysis()

        if result and result[0] == 200:
            feature_vectors.append(song.analysis.to_list())
        else:
            if remove_failures:
                print(f"Error for {song.song_title}; Skipping and removing song.")
                songs_to_remove.append(song)

    for song in songs_to_remove:
        song_collection.remove(song)

    return feature_vectors


def parseint(s: str) -> int | None:
    match = re.search(r"retry after (\d+)", s)

    if match:
        retry_seconds = int(match.group(1))
        return retry_seconds  # Output: 4
    else:
        print("No retry time found.")
        return None


#
# This through model acts as a middle-man connection between Playlist and Song.
# It doesn't contain actual song or playlist data like titles, names, or ISRCs; just the relationship between the two.

# By default, Django creates an automatic through model behind the scenes when using ManyToManyField.
# That default version just connects the two models with a simple mapping:
#
#  id   |   song_id   |  playlist_id
# ___________________________________
#  1    |      1      |      5
#  2    |      3      |      5
#  3    |      1      |      2
#
# This tells us that Songs 1 and 3 are in Playlist 5, and Song 1 is also in Playlist 2.

# However, this default join table doesn't preserve **order**, because Django retrieves ManyToMany relationships
# using unordered SQL joins. So we can't rely on the order the songs were added.

# To preserve order, we can define our own `through` model and add an `order` field:
#
#  id   |   song_id   |  playlist_id  |  order
# ______________________________________________
#  1    |      1      |      5        |    3
#  2    |      3      |      5        |    5
#  3    |      1      |      2        |    1
#
# Now we can say:
# - Song 1 is the 3rd song in Playlist 5
# - Song 3 is the 5th song in Playlist 5
# - Song 1 is the 1st song in Playlist 2

# This lets us store order **on the relationship itself**, without duplicating or modifying the global Song or Playlist
# objects. In turn, we can access <Song> instances globally without creating *separate* instances for each playlist.

# The PlaylistSong table becomes a connector that not only joins <Playlist> and <Song>, but also adds context to each
# relationship (i.e. the order each song has in a playlist)


####### How to access playlist songs in order using Django ORM: #######
# songs_in_my_playlist_in_order = my_playlist.playlist_songs.all()
#
# <Note: playlist_songs is the related name of the PlaylistSong model to the playlist instance>
#
# This retrieves all <PlaylistSong> rows for a given <Playlist> and orders them based on the <order> field.


class PlaylistSong(models.Model):
    playlist = models.ForeignKey(UserPlaylist, on_delete=models.CASCADE, related_name="playlist_songs")
    song = models.ForeignKey(Song, on_delete=models.PROTECT)
    order = models.PositiveIntegerField()

    class Meta:
        unique_together = ('playlist', 'song')  # A song cannot be associated with a playlist more than once
        ordering = ['order']

    def __str__(self):
        return f"{self.song.song_title}: {self.playlist.playlist_name}"
