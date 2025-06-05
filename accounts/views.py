from logging import raiseExceptions

import rest_framework_simplejwt.exceptions

from rest_framework.generics import GenericAPIView, RetrieveAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import CustomUserSerializer, UserRegistrationSerializer, UserLoginSerializer


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
    serializer_class = CustomUserSerializer

    def post(self, request, *args, **kwargs):
        user = self.request.user
        data = self.request.data

        spotifyCode = data["code"]
        spotifyState = data["state"]

        417
