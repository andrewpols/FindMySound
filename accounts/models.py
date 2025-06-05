from django.db import models
from django.contrib.auth.models import AbstractUser


class CustomUser(AbstractUser):

    # Not necessary to sign up, but used in spotify authentication afterwards
    spotify_username = models.CharField(max_length=200, unique=True, null=True, blank=True)
    email = models.EmailField(unique=True)
    REQUIRED_FIELDS = ["email"]

    verbose_name = "Custom User"
    verbose_name_plural = "Custom Users"

    def __str__(self):
        return self.username
