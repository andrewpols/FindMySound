import django.db.utils
from django.db import transaction
from django.utils.timezone import now
from rest_framework import status
from rest_framework.generics import GenericAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from utils.spotify_api import *
from .models import *
from .music_recommender import recommend_songs
from .serializers import SongSerializer, UserPlaylistSerializer
from accounts.serializers import UserSpotifyProfileSerializer


class RetrieveUserSpotifyPlaylistsAPIView(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):
        user = self.request.user

        if not user or not hasattr(user, 'spotify_profile'):
            return Response(status=status.HTTP_400_BAD_REQUEST, data={"reauth_required": True})

        spotify_profile = user.spotify_profile
        spotify_playlists_response = get_user_spotify_playlists(spotify_profile)

        if spotify_playlists_response is None:
            return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={"reauth_required": True})

        # Backend-used data for creating objects
        playlist_songs = []
        spotify_song_data = []

        # Frontend-used data for sending objects; sending the newly created objects causes issues with Database writes
        playlists_to_send = []

        for playlist in spotify_playlists_response:

            if playlist["images"]:
                image_url = playlist["images"][0]["url"]
            else:
                image_url = ""

            playlist_instance, created = UserPlaylist.objects.get_or_create(spotify_user=spotify_profile,
                                                                            playlist_name=playlist["name"],
                                                                            image_url=image_url,
                                                                            spotify_id=playlist["id"])

            tracklist_href, tracklist_length = playlist["tracks"]["href"], playlist["tracks"]["total"]

            song_data = get_spotify_songs_from_playlist(tracklist_href, tracklist_length,
                                                        spotify_profile, playlist_instance)

            if song_data is None:
                return Response(status=status.HTTP_500_INTERNAL_SERVER_ERROR, data={"reauth_required": True})

            spotify_song_data.extend(song_data)

            playlists_to_send.append(playlist_instance)

        for song_data in spotify_song_data:
            artist, artist_created = Artist.objects.get_or_create(
                artist_name=song_data["artist_name"],
                spotify_id=song_data["artist_spotify_id"]
            )
            song, song_created = Song.objects.get_or_create(
                isrc=song_data["isrc"]
            )

            if (song_created or not song.song_title or not song.artist or not song.album or not song.duration
                    or not song.image_url or not song.spotify_uri):

                print(song_data)

                if not song.song_title:
                    song.song_title = song_data["song_title"]

                if not song.artist:
                    song.artist = artist

                if not song.album:
                    song.album = song_data["album"]

                if not song.duration:
                    song.duration = song_data["duration"]

                if not song.image_url:
                    song.image_url = song_data["image_url"]

                if not song.spotify_uri:
                    song.spotify_uri = song_data["spotify_uri"]

                song.save()

            playlist_songs.append(PlaylistSong(
                playlist=song_data["playlist_instance"],
                song=song,
                order=song_data["order"]
            ))

        try:
            with transaction.atomic():
                # To avoid duplicates and remove deleted playlists and keep updated w/ current selection of playlists:
                # This deletes the PlaylistSong objects related to the playlists we're updating to make way for new ones
                PlaylistSong.objects.filter(playlist__in=playlists_to_send).delete()

                # Delete the playlists that are NOT in playlists_to_send (i.e., deleted on Spotify)
                # In other words, delete all playlists EXCEPT the playlists we've recieved
                spotify_profile.user_playlists.exclude(id__in=[playlist.id for playlist in playlists_to_send]).delete()

                transaction.on_commit(lambda: PlaylistSong.objects.bulk_create(playlist_songs))

        except django.db.utils.Error as e:
            print(e)

        spotify_profile.last_synced = now()
        spotify_profile.save()

        data = UserPlaylistSerializer(playlists_to_send, many=True).data

        return Response(status=status.HTTP_200_OK, data=data)


class ReccomendSongsAPIView(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):

        if not request.data:
            return Response(status=status.HTTP_204_NO_CONTENT)

        playlist_ids = [playlist["spotify_id"] for playlist in request.data]
        playlists = UserPlaylist.objects.filter(spotify_id__in=playlist_ids).all()

        recommended_song_info = recommend_songs(playlists, request.user.spotify_profile)

        if recommended_song_info.get("status_code") == 401:
            return Response(status=401, data={"reauth_required": True})
        elif recommended_song_info.get("status_code") != 200:
            return Response(status=recommended_song_info.get("status_code"))

        recommended_songs = recommended_song_info.get("sorted_songs")

        serialized_recommended_songs = [SongSerializer(song).data for song in list(recommended_songs.keys())[:200]]

        spotify_profile = request.user.spotify_profile
        spotify_profile.playlists_created += 1
        spotify_profile.songs_recommended += len(serialized_recommended_songs)

        spotify_profile.save()

        return Response(status=status.HTTP_200_OK,
                        data={"tracks": serialized_recommended_songs,
                              "spotify_profile": UserSpotifyProfileSerializer(spotify_profile).data})


class CreateSpotifyPlaylistAPIView(GenericAPIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, *args, **kwargs):

        print(request.data)

        if not request.user or not hasattr(request.user, "spotify_profile"):
            return Response(status=status.HTTP_403_FORBIDDEN)

        spotify_profile = request.user.spotify_profile
        playlist_created_data = create_spotify_playlist(spotify_profile)

        status_code = playlist_created_data.get("status_code")

        if playlist_created_data.get("reauth_required"):
            return Response(status=status_code, data={"reauth_required": True})
        elif status_code != 201:
            return Response(status=status_code,
                            data={
                                "messages":
                                    {"server": ["There was an error processing your request."]}
                            })

        # else, status is 201! continue...
        spotify_uris = [song["spotify_uri"] for song in request.data]
        is_created_data = add_songs_to_playlist(playlist_id=playlist_created_data["spotify_playlist_id"],
                                                songs_to_add=spotify_uris, spotify_profile=spotify_profile)

        if is_created_data.get("reauth_required"):
            return Response(status=is_created_data["status_code"], data={"reauth_required": True})
        elif is_created_data["status_code"] != 201:
            return Response(status=is_created_data["status_code"],
                            data={
                                "messages":
                                    {"server": ["There was an error processing your request."]}
                            })

        data = playlist_created_data
        data.pop("status_code")

        return Response(status=status.HTTP_201_CREATED, data=data)
