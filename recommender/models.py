from django.db import models


class Artist(models.Model):
    artist_name = models.CharField(max_length=200)
    spotify_id = models.CharField(max_length=200, primary_key=True)

    def __str__(self):
        return self.artist_name


class SongAnalysis(models.Model):
    # ReccoBeats Analysis Features
    acousticness = models.FloatField()
    danceability = models.FloatField()
    energy = models.FloatField()
    instrumentalness = models.FloatField()
    liveness = models.FloatField()
    loudness = models.FloatField()
    spechiness = models.FloatField()
    tempo = models.FloatField()
    valence = models.FloatField()

    def __str__(self):
        return f"Analysis: valence={self.valence}, tempo={self.tempo}, energy={self.energy}"


class Song(models.Model):
    song_title = models.CharField(max_length=200)
    artist = models.ForeignKey(Artist, null=True, on_delete=models.SET_NULL)
    analysis = models.ForeignKey(SongAnalysis, null=True, on_delete=models.SET_NULL)
    isrc = models.CharField(max_length=200, primary_key=True)

    def __str__(self):
        return self.song_title


class UserPlaylist(models.Model):
    playlist_name = models.CharField(max_length=200)
    songs = models.ManyToManyField(Song)

    def __str__(self):
        return self.playlist_name
