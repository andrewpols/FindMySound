from .models import *
from sklearn.metrics.pairwise import cosine_similarity


def recommend_songs(user_playlists, spotify_profile) -> dict:
    compared_feature_vectors = []

    for playlist in user_playlists:
        playlist_feature_vectors = playlist.set_playlist_analysis()
        compared_feature_vectors.extend(playlist_feature_vectors)

    user_songs = [song for playlist in user_playlists for song in playlist.songs.all()]

    candidate_song_info = get_candidate_songs(user_songs, spotify_profile)

    candidate_status = candidate_song_info.get("status_code")

    candidate_songs = candidate_song_info["tracks"]

    if candidate_status == 401:
        return {"reauth_required": True, "status_code": candidate_status}
    elif candidate_status != 200:
        return {"reauth_required": False, "status_code": candidate_status}

    candidate_feature_vectors = run_analysis(candidate_songs, remove_failures=True)

    similarity_scores = cosine_similarity(
        candidate_feature_vectors, compared_feature_vectors
    )

    similarity_mapping = {}

    for i in range(len(candidate_songs)):
        song = candidate_songs[i]
        song_score = similarity_scores[i].mean()
        similarity_mapping[song] = song_score

    return {"sorted_songs": sorted_dictionary_by_values(similarity_mapping), "reauth_required": False,
            "status_code": 200}


def get_candidate_songs(comparison_songs, spotify_profile):
    user_artists = []

    for song in comparison_songs:
        artist = song.artist
        if artist not in user_artists:
            user_artists.append(artist)

    spotify_profile.artists_discovered += len(user_artists)

    artist_top_songs = []
    for artist in user_artists:
        top_tracks = artist.get_top_n_songs(spotify_profile=spotify_profile)

        tracks_status = top_tracks.get("status_code")

        if tracks_status == 401:
            return {"reauth_required": True, "status_code": top_tracks.get("status_code")}
        elif tracks_status != 200:
            return {"reauth_required": False, "status_code": top_tracks.get("status_code")}

        for track in top_tracks["tracks"]:
            print(f"Adding {track['title']} by {track['artist']} to candidate songs")
            song, song_created = Song.objects.get_or_create(isrc=track["isrc"])

            if song in artist_top_songs:
                continue

            print(track)

            if (song_created or not song.song_title or not song.artist or not song.album or not song.duration
                    or not song.image_url or not song.spotify_uri):

                if not song.song_title:
                    song.song_title = track["title"]

                if not song.artist:
                    song.artist = artist

                if not song.album:
                    song.album = track["album"]

                if not song.duration:
                    song.duration = track["duration"]

                if not song.image_url:
                    song.image_url = track["image_url"]

                if not song.spotify_uri:
                    song.spotify_uri = track["spotify_uri"]

                song.save()

            artist_top_songs.append(song)

    return {"tracks": artist_top_songs, "reauth_required": False, "status_code": 200}


def sorted_dictionary_by_values(d: dict) -> dict:
    """Return a sorted dictionary in non-increasing order, maintaining the original mapping"""
    return {
        key: value
        for key, value in sorted(d.items(), key=lambda kv: kv[1], reverse=True)
    }
