import rest_framework_simplejwt.exceptions

from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken

from django.utils.timezone import now

from .serializers import *
from .models import UserSpotifyProfile

from django.utils import timezone

from utils.spotify_api import get_spotify_tokens, get_spotify_details, refresh_curr_tokens


class UserRegistrationAPIView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserRegistrationSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        user = serializer.save()
        token = RefreshToken.for_user(user=user)
        data = serializer.data

        data['tokens'] = {
            'refresh': str(token),
            'access': str(token.access_token)
        }

        data['user'] = CustomUserSerializer(user).data

        return Response(data=data, status=status.HTTP_201_CREATED)


class UserLoginAPIView(GenericAPIView):
    permission_classes = (AllowAny,)
    serializer_class = UserLoginSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data
        serializer = CustomUserSerializer(user)  # This acts to serialize the user data (tokens) after validation
        token = RefreshToken.for_user(user=user)

        data = serializer.data

        data['tokens'] = {
            'refresh': str(token),
            'access': str(token.access_token)
        }

        return Response(data=data, status=status.HTTP_200_OK)


class UserLogoutAPIView(GenericAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = UserLoginSerializer

    def post(self, request, *args, **kwargs):

        try:
            refresh_token = request.data['refresh']  # str repr of refresh_token from user request
            token = RefreshToken(token=refresh_token)  # token obj of refresh_token

            # user logged out, so blacklist refresh_token on rotation (ensures a max of 1 refr. token per lifecycle)
            token.blacklist()
            return Response(status.HTTP_205_RESET_CONTENT)
        except rest_framework_simplejwt.exceptions.TokenError as e:
            return Response(status=status.HTTP_400_BAD_REQUEST)


class UserInfoAPIView(RetrieveAPIView):
    permission_classes = (IsAuthenticated,)
    serializer_class = CustomUserSerializer

    def get_object(self):
        return self.request.user


class UserSpotifyLinkAPIView(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def put(self, request, *args, **kwargs):

        print('HERE!')
        spotify_code = request.data.get("spotify_code")

        access_token, access_token_expiry, refresh_token = get_spotify_tokens(spotify_code)

        if not access_token or not refresh_token:
            error_data = {
                "reauth_required": True,
                "message": "Failed to retrieve access token. Please reauthorize with Spotify.",
                "timestamp": timezone.now().isoformat()
            }
            return Response(status=status.HTTP_400_BAD_REQUEST, data=error_data)

        spotify_profile, created = UserSpotifyProfile.objects.get_or_create(user=request.user)

        spotify_profile.access_token = access_token
        spotify_profile.access_token_expiry = access_token_expiry
        spotify_profile.refresh_token = refresh_token

        spotify_username, spotify_id, spotify_profile_image = get_spotify_details(spotify_profile)

        # i.e. refresh didn't work
        if spotify_username is None or spotify_id is None or spotify_profile_image is None:
            error_data = {
                "reauth_required": True,
                "message": "Failed to retrieve access token. Please reauthorize with Spotify.",
                "timestamp": timezone.now().isoformat()
            }
            return Response(status=status.HTTP_403_FORBIDDEN, data=error_data)

        spotify_profile.spotify_username = spotify_username
        spotify_profile.spotify_id = spotify_id
        spotify_profile.spotify_profile_image = spotify_profile_image
        spotify_profile.scopes_granted = request.data.get("current_scope")

        spotify_profile.save()  # Add changes to database; essentially the whole goal here besides returning data below

        data = UserSpotifyProfileSerializer(spotify_profile).data

        return Response(status=status.HTTP_200_OK, data=data)


class UserSpotifyUpdateDetailsAPIView(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def put(self, request, *args, **kwargs):
        user = request.user

        if not user or not hasattr(user, 'spotify_profile'):
            return Response(status=status.HTTP_400_BAD_REQUEST, data={"reauth_required": True})

        spotify_profile = user.spotify_profile
        display_name, spotify_id, profile_image = get_spotify_details(spotify_profile)

        if None in [display_name, spotify_id, profile_image]:
            return Response(status=status.HTTP_401_UNAUTHORIZED, data={"reauth_required": True})

        # because we're updating values in succession, we need to update the model this way to avoid race conditions
        # with the API call after
        UserSpotifyProfile.objects.filter(pk=spotify_profile.pk).update(
            spotify_username=display_name,
            spotify_id=spotify_id,
            spotify_profile_image=profile_image,
            last_synced=now()
        )

        data = {
            "spotify_username": display_name,
            "spotify_profile_image": profile_image,
            "spotify_id": spotify_id
        }

        return Response(status=status.HTTP_200_OK, data=data)


class UserSpotifyRefreshAPIView(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = self.request.user

        if not user or not hasattr(user, 'spotify_profile'):
            return Response(status=status.HTTP_400_BAD_REQUEST, data={"reauth_required": True})

        spotify_profile = user.spotify_profile
        is_refreshed = refresh_curr_tokens(spotify_profile)

        if is_refreshed:

            data = UserSpotifyProfileSerializer(spotify_profile).data

            return Response(status=status.HTTP_200_OK, data=data)
        else:
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={"reauth_required": True})
