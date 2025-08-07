from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone


class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    REQUIRED_FIELDS = ["email"]

    verbose_name = "Custom User"
    verbose_name_plural = "Custom Users"

    def __str__(self):
        return self.username


class UserSpotifyProfile(models.Model):
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name="spotify_profile")
    spotify_id = models.CharField(max_length=300, null=True)
    spotify_username = models.CharField(max_length=200, null=True, blank=True)
    spotify_profile_image = models.URLField(blank=True, null=True)

    access_token = models.CharField(max_length=300, null=True)
    access_token_expiry = models.DateTimeField(null=True)
    refresh_token = models.CharField(max_length=300, null=True)

    scopes_granted = models.CharField(max_length=300, blank=True, null=True)

    last_synced = models.DateTimeField(default=timezone.now)

    songs_recommended = models.PositiveIntegerField(default=0)
    playlists_created = models.PositiveIntegerField(default=0)
    artists_discovered = models.PositiveIntegerField(default=0)
