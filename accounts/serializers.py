from .models import CustomUser, UserSpotifyProfile
from rest_framework import serializers
from django.contrib.auth import authenticate

from recommender.serializers import UserPlaylistSerializer


class UserSpotifyProfileSerializer(serializers.ModelSerializer):
    user_playlists = UserPlaylistSerializer(read_only=True, many=True)

    class Meta:
        model = UserSpotifyProfile

        # Only the stuff I want frontend seeing (i.e. not tokens)
        fields = ("id", "spotify_username", "spotify_profile_image", "access_token_expiry", "user_playlists",
                  "last_synced", "spotify_id", "scopes_granted", "songs_recommended", "playlists_created",
                  "artists_discovered")


class CustomUserSerializer(serializers.ModelSerializer):
    spotify_profile = UserSpotifyProfileSerializer(read_only=True)

    class Meta:
        model = CustomUser
        fields = ("id", "username", "email", "spotify_profile")


class UserRegistrationSerializer(serializers.ModelSerializer):
    password1 = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = CustomUser
        fields = ("id", "username", "password1", "password2", "email")

        extra_kwargs = {
            "password": {"write_only": True}
        }

    def validate(self, attrs):
        if attrs['password1'] != attrs['password2']:
            raise serializers.ValidationError('Passwords do not match.')

        password = attrs.get('password1', '')

        if len(password) < 10:
            raise serializers.ValidationError('Password must be at least 10 characters.')

        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password1")
        validated_data.pop("password2")

        return CustomUser.objects.create(password=password, **validated_data)


class UserLoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(**data)
        if user and user.is_active:
            return user
        else:
            raise serializers.ValidationError('Incorrect Credentials')
