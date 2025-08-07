from django.urls import path
from . import views

urlpatterns = [
    path('playlists', views.RetrieveUserSpotifyPlaylistsAPIView.as_view(), name="user-playlists"),
    path('find-music', views.ReccomendSongsAPIView.as_view(), name="find-music"),
    path('create-playlist', views.CreateSpotifyPlaylistAPIView.as_view(), name="create-playlist")
]
