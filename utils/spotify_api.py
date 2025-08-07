import os
from base64 import b64encode
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from urllib.parse import urlencode
import requests

from django.utils.timezone import now
from dotenv import load_dotenv

from recommender.models import *

env_path = Path(__file__).resolve().parent.parent / "config" / ".env"
load_dotenv(dotenv_path=env_path)


def get_encoded_client_credentials():
    client_id = os.environ.get("SPOTIFY_CLIENT_ID", "")
    client_secret = os.environ.get("SPOTIFY_CLIENT_SECRET", "")

    client_credentials = f"{client_id}:{client_secret}"

    # str -> bytes (via encode)
    # bytes -> b64 bytes (b64encode)
    # b64 bytes -> str (decode)
    encoded_client_credentials = b64encode(client_credentials.encode()).decode()

    return encoded_client_credentials


def get_spotify_tokens(code: str) -> tuple[Optional[str], Optional[datetime], Optional[str]]:
    spotify_url = "https://accounts.spotify.com/api/token"

    form = {
        "code": code,
        "redirect_uri": "http://127.0.0.1:5173/FindMySound/accounts/authenticate",
        "grant_type": "authorization_code"
    }

    encoded_client_credentials = get_encoded_client_credentials()

    headers = {
        "content-type": "application/x-www-form-urlencoded",
        "Authorization": f"Basic {encoded_client_credentials}"
    }

    try:
        response = requests.post(url=spotify_url, data=form, headers=headers)

        # Instead of doing response.raise_for_status() I wrap in a try-except block to send None, None, None upstream
        # See <refresh_curr_tokens> for more details

        data = response.json()

        if "access_token" not in data or "expires_in" not in data:
            # Log the full response for debugging
            print("Error response from Spotify:", data)
            return None, None, None

        access_token_expiry = now() + timedelta(seconds=data["expires_in"])

        return data["access_token"], access_token_expiry, data["refresh_token"]

    except requests.exceptions.HTTPError as e:
        # TODO: Possibly log errors
        print(e)
        return None, None, None


def get_spotify_details(spotify_profile) -> tuple[Optional[str], Optional[str], Optional[str]]:
    # i.e. access token is expired
    if now() > spotify_profile.access_token_expiry:
        # access_token expired, refresh needed
        is_refreshed = refresh_curr_tokens(spotify_profile)

        if not is_refreshed:
            return None, None, None

    headers = {
        "Authorization": f"Bearer {spotify_profile.access_token}"
    }

    try:
        response = requests.get(url="https://api.spotify.com/v1/me", headers=headers)
        response.raise_for_status()
        data = response.json()

        if data["images"]:
            profile_image = data["images"][0].get("url", "")
        else:
            profile_image = ""

        return data.get("display_name", ""), data.get("id", ""), profile_image

    except requests.exceptions.HTTPError as e:
        print(e)
        return None, None, None


def refresh_curr_tokens(spotify_profile) -> bool:
    """Refresh and save user spotify tokens. Return whether tokens were succesfully saved"""
    refresh_url = "https://accounts.spotify.com/api/token"
    refresh_token = spotify_profile.refresh_token

    headers = {
        'Content-Type': 'application/x-www-form-urlencoded'
    }

    client_id = os.environ.get("SPOTIFY_CLIENT_ID", None)

    if client_id is None:
        return False

    body = urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id
    })

    response = requests.post(url=refresh_url, data=body, headers=headers)

    # i.e. Refresh token has expired; return None upstream until the View recieves it, then return an HTTP-Response
    # that the frontend recieves --> this triggers redirect to OAuth.
    if response.status_code == 401:
        return False

    try:
        data = response.json()

        access_token = data["access_token"]
        access_token_expiry = now() + timedelta(seconds=data["expires_in"])

        # Per Spotify API, refresh token may be replaced or maintained after new access token is issued
        refresh_token = data.get("refresh_token", refresh_token)

        spotify_profile.access_token = access_token
        spotify_profile.refresh_token = refresh_token
        spotify_profile.access_token_expiry = access_token_expiry
        spotify_profile.save()

        return True
    except KeyError as e:
        print(e)
        return False


def get_user_spotify_playlists(spotify_profile):
    base_url = f"https://api.spotify.com/v1/users/{spotify_profile.spotify_id}/playlists?"
    data = {
        "limit": 10
    }

    url = base_url + urlencode(data)

    if now() > spotify_profile.access_token_expiry:
        is_refreshed = refresh_curr_tokens(spotify_profile)

        if not is_refreshed:
            return None

    headers = {
        "Authorization": f"Bearer {spotify_profile.access_token}"
    }

    try:
        response = requests.get(url=url, headers=headers)
        response.raise_for_status()
        data = response.json()

        print([playlist for playlist in data["items"] if playlist["owner"]["id"] == spotify_profile.spotify_id])

        # return [playlist for playlist in data["items"] if playlist["owner"]["id"] == spotify_profile.spotify_id]
        return data["items"]
    except requests.exceptions.HTTPError as e:
        print(e)
        return None


def get_spotify_songs_from_playlist(tracklist_href: str, tracklist_length: int, spotify_profile, playlist_instance):
    fields = {
        "limit": 100,
        "offset": 0,
    }

    playlist_song_entries = []

    while fields["offset"] < tracklist_length:
        # i.e. access token is expired
        if now() > spotify_profile.access_token_expiry:
            # access_token expired, refresh needed
            is_refreshed = refresh_curr_tokens(spotify_profile)

            if not is_refreshed:
                return None

        new_entries = get_tracks(tracklist_href, fields, spotify_profile.access_token, playlist_instance)

        if new_entries is None:
            return None

        playlist_song_entries.extend(new_entries)

        fields["offset"] += 100

    return playlist_song_entries


def get_tracks(tracklist_href, fields, access_token, playlist_instance):
    playlist_songs_data = []
    url = f"{tracklist_href}?{urlencode(fields)}"

    headers = {
        "Authorization": f"Bearer {access_token}"
    }
    try:
        response = requests.get(url=url, headers=headers)

        data = response.json()

        tracks = data["items"]

        for i, item in enumerate(tracks):
            order = i + 1 + fields["offset"]

            track = item["track"]

            if track["is_local"]:
                continue

            try:
                image_url = track["album"]["images"][0]["url"]
            except IndexError or KeyError:
                image_url = ""

            playlist_songs_data.append({
                "song_title": track["name"],
                "isrc": track["external_ids"].get("isrc"),
                "spotify_uri": track["uri"],
                "artist_name": track["artists"][0]["name"],
                "artist_spotify_id": track["artists"][0]["id"],
                "album": track["album"]["name"],
                "image_url": image_url,
                "duration": track["duration_ms"],
                "order": order,
                "playlist_instance": playlist_instance
            })

        return playlist_songs_data
    except requests.exceptions.HTTPError as e:
        print(e)
        return None


def create_spotify_playlist(spotify_profile):
    api_url = f"https://api.spotify.com/v1/users/{spotify_profile.spotify_id}/playlists"

    headers = {
        "Authorization": f"Bearer {spotify_profile.access_token}"
    }

    body = {
        "name": "FindMySound Recommended Playlist",
        "description": "This playlist was recommended and generated by FindMySound, made by andrewpols "
                       "@ https://github.com/andrewpols",
    }

    response = requests.post(url=api_url, json=body, headers=headers)

    if response.status_code == 401:
        return {
            "status_code": response.status_code,
            "reauth_required": True
        }
    elif response.status_code == 201:
        data = response.json()

        return_data = {
            "status_code": response.status_code,
            "url": data["external_urls"]["spotify"],
            "spotify_playlist_id": data["id"]
        }

        return return_data
    else:
        return {
            "status_code": response.status_code
        }


def add_songs_to_playlist(playlist_id: str, songs_to_add: list[str], spotify_profile) -> dict:
    try:
        api_url = f"https://api.spotify.com/v1/playlists/{playlist_id}/tracks"
        position = 0

        headers = {
            "Authorization": f"Bearer {spotify_profile.access_token}"
        }

        while position < len(songs_to_add):
            body = {
                "uris": songs_to_add[position: position + 100],
                "position": position
            }

            response = requests.post(url=api_url, json=body, headers=headers)

            if response.status_code == 401:
                return {"created": False, "reauth_required": True, "status_code": response.status_code}
            elif response.status_code != 201:
                return {"created": False, "reauth_required": False, "status_code": response.status_code}

            position += 100

        return {"created": True, "reauth_required": False, "status_code": 201}
    except requests.exceptions.HTTPError as e:
        print(e)
        return {"created": False, "reauth_required": False}
