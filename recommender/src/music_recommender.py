import base64
import json
import time
import re
import os
from dotenv import load_dotenv

import requests
import asyncio
import aiohttp

import ffmpeg
import imageio_ffmpeg

from requests.utils import requote_uri
from io import BytesIO

from sklearn.metrics.pairwise import cosine_similarity

SPOTIFY_JSON = "../data/example-api-responses/spotify-ovoxo-playlist.json"

load_dotenv(dotenv_path="../config/.env")


# TODO — Overall Goals: Add feature vector components like "Artist in user playlist" or "genre in user playlist"
# ^^ Too expensive to test these things now; will come back once database is implemented


class Artist:
    name: str
    spotify_id: str

    def __init__(self, name: str, spotify_id: str) -> None:
        self.name = name
        self.spotify_id = spotify_id

    def get_top_n_songs(self, spotify_profile, n: int = 25) -> list[dict]:
        """Returns the top <n> songs by their respective identifying ISRC codes."""

        spotify_api_url = (
            f"https://api.spotify.com/v1/artists/{self.spotify_id}/top-tracks"
        )

        headers = {"Authorization": f"Bearer {spotify_profile.access_token}"}

        response = requests.get(url=spotify_api_url, headers=headers)

        response.raise_for_status()

        if response.status_code != 200:
            return []

        track_list = []

        for track in response.json()["tracks"][:n]:
            track_data = {
                "title": track["name"],
                "artist": self,
                "isrc": track["external_ids"]["isrc"],
            }

            track_list.append(track_data)

        return track_list


class Song:
    """A class representing Song objects.

    Instance Attributes:
        - title: The title of the song
        - artist: The artist of the song
        - isrc: The International Standard Recording Code (ISRC) identification of the song
    """

    title: str
    artist: Artist
    isrc: str

    def __init__(self, title: str, artist: Artist, isrc: str) -> None:
        """Initialize the song object"""
        self.title = title
        self.artist = artist
        self.isrc = isrc

    def get_deezer_preview(self) -> str | None:
        base_url = "https://api.deezer.com/track/"
        query = requote_uri(f"isrc:{self.isrc}")
        deezer_url = base_url + query

        response = requests.get(deezer_url)
        response.raise_for_status()
        data = response.json()

        items = data.get("preview", {})

        if items:
            return items

        return None

    def reencode_preview_url(self) -> BytesIO:
        # Add imageio-ffmpeg binary to PATH
        os.environ["PATH"] = (
            os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
            + os.pathsep
            + os.environ["PATH"]
        )

        preview_url = self.get_deezer_preview()

        if not preview_url:
            raise ValueError("No preview URL available from Deezer!")

        # Download preview into variable
        response = requests.get(preview_url)
        if (
            response.status_code != 200
        ):  # Raise ValueError if preview could not be downloaded from the url
            raise ValueError("Failed to download preview")

        preview_bytes = BytesIO(
            response.content
        )  # Keep response in memory with BytesIO; avoid writing to disk (no .mp3 files)

        # Re-encode using ffmpeg-python; fixes bit-rate issue from Deezer previews
        process = (
            ffmpeg.input("pipe:0")
            .output("pipe:1", format="mp3", audio_bitrate="192k", ac=2, ar=44100)
            .run_async(pipe_stdin=True, pipe_stdout=True, pipe_stderr=True)
        )

        out, err = process.communicate(
            input=preview_bytes.read()
        )  # out: output from process; err: possible errors from process

        if process.returncode != 0:
            raise RuntimeError("ffmpeg failed:\n" + err.decode())

        result = BytesIO(out)  # Final fixed preview with enhanced bitrate
        result.seek(0)
        return result

    async def get_song_analysis(self):
        reccobeats_url = "https://api.reccobeats.com/v1/analysis/audio-features"

        try:
            song_data = self.reencode_preview_url()

            form = aiohttp.FormData()
            form.add_field(
                "audioFile",
                song_data,
                filename="preview.mp3",
                content_type="audio/mpeg",
            )

            headers = {"Accept": "application/json"}

            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url=reccobeats_url, headers=headers, data=form, ssl=False
                ) as analysis:
                    print(await analysis.text())
                    print(analysis.status)

                    if analysis.status not in {200, 429}:
                        print("ReccoBeats Analysis Error; Song Skipped.")
                        return None
                    else:
                        return analysis.status, await analysis.json()

        except ValueError as e:
            print("No Preview URL Found; Song skipped")
            print(e)
            return None


def get_songs_from_playlist(filepath: str) -> list[Song]:
    """Return a list of Song objects from a user's playlist"""
    with open(filepath, "r") as f:
        data = json.load(f)

    track_entries = data["tracks"][
        "items"
    ]  # Contains all data of playlist tracks (e.g. id, added_at, ...)
    track_list = [
        entry["track"] for entry in track_entries
    ]  # A list of each track info, including artist, type of track, ...)

    # Map of artist name to Artist Object so that each artist has at most one obj in memory
    artist_map: dict[str, Artist] = {}

    songs = []
    for track in track_list:
        artist_data = track["artists"][0]

        if artist_data["name"] in artist_map:
            artist = artist_map.get(artist_data["name"])
        else:
            artist = Artist(artist_data["name"], artist_data["id"])
            artist_map[artist.name] = artist

        song = Song(track["name"], artist, track["external_ids"]["isrc"])
        songs.append(song)

    return songs


class Playlist:
    songs: list[Song]
    analysis: list[tuple[str, dict]]
    feature_vectors: list[list[int]]

    def __init__(self, songs: list[Song]) -> None:
        self.songs = songs

        start_time = time.time()
        self.analysis = asyncio.run(self.get_playlist_analysis())
        end_time = time.time()
        print(f"time elapsed: {end_time - start_time} seconds")

        self.reorder_songs()

        self.feature_vectors = [
            list(analysis.values()) for song, analysis in self.analysis
        ]

    async def get_playlist_analysis(self) -> list[tuple[str, dict]]:
        queue = asyncio.Queue()
        results = []

        # Fill the queue
        for song in self.songs:
            await queue.put(song)

        # Explanation: Each worker handles a single song analysis request.
        # By offloading work to an asyncio.Queue, we control how many concurrent analyses run at a time
        # and how much delay there is between tasks, for each worker.
        #
        # For example, with workers=3, we have 3 independent workers, each pulling songs off the queue
        # and running get_song_analysis(). After finishing an analysis, the worker marks the task as done
        # (queue.task_done()) and then sleeps for a fixed delay (e.g., 3 seconds) before requesting the next song.
        #
        # Because each worker is asynchronous and runs independently, this setup allows us to process multiple songs
        # concurrently — but spaced apart in time — without overloading the rate-limited API.
        #
        # The result is that we’re processing up to 3 analyses at a time, with each worker pacing itself
        # after every request. This effectively staggers requests at regular intervals, without batching or blocking.
        async def worker():
            while not queue.empty():
                song = await queue.get()
                try:
                    print(f"Analyzing: {song.title}")
                    result = await song.get_song_analysis()
                    if result and result[0] == 200:
                        results.append((song, result[1]))
                    elif result and result[0] == 429:
                        time_to_wait = parseint(result[1]["error"])

                        print("Waiting for rate limit!")
                        await asyncio.sleep(time_to_wait)
                        print("Done waiting!")
                        await queue.put(song)
                    else:
                        self.songs.remove(song)
                except Exception as e:
                    print(f"Error for {song.title}: {e}")
                await asyncio.sleep(2)  # rate-limiting delay
                queue.task_done()

        # We can have more workers, but if we're getting rate-limited badly, use just 1-2
        num_workers = 3
        workers = [asyncio.create_task(worker()) for _ in range(num_workers)]

        await queue.join()  # Wait for all songs to be processed

        for w in workers:
            w.cancel()

        return results

    def reorder_songs(self) -> None:
        """Reorder the order of <self.songs> to align with the returned analysis (order may be affected by
        the queue in performing analysis after getting rate_limited). This is a mutating method.
        """

        songs = []

        for song, analysis in self.analysis:
            songs.append(song)

        self.songs = songs


def parseint(s: str) -> int | None:
    match = re.search(r"retry after (\d+)", s)

    if match:
        retry_seconds = int(match.group(1))
        return retry_seconds  # Output: 4
    else:
        print("No retry time found.")
        return None


class Recommender:
    user_playlist: Playlist

    def __init__(self, user_playlist: Playlist):
        self.user_playlist = user_playlist

    def reccommend_songs(self) -> dict:
        candidate_songs = self.get_candidate_songs()

        candidate_playlist = Playlist(candidate_songs)
        similarity_scores = cosine_similarity(
            candidate_playlist.feature_vectors, self.user_playlist.feature_vectors
        )

        similarity_mapping = {}

        for i in range(len(candidate_playlist.songs)):
            song = candidate_playlist.songs[i].title
            song_score = similarity_scores[i].mean()
            similarity_mapping[song] = song_score

        return sorted_dictionary_by_values(similarity_mapping)

    def get_candidate_songs(self) -> list[Song]:
        user_artists = []

        for song in self.user_playlist.songs:
            artist = song.artist
            if artist not in user_artists:
                user_artists.append(artist)

        print(user_artists)

        artist_top_songs = []
        for artist in user_artists:
            top_tracks = artist.get_top_n_songs()

            for track in top_tracks:
                song = Song(track["title"], track["artist"], track["isrc"])
                artist_top_songs.append(song)

        return artist_top_songs


def sorted_dictionary_by_values(d: dict) -> dict:
    """Return a sorted dictionary in non-increasing order, maintaining the original mapping"""
    return {
        key: value
        for key, value in sorted(d.items(), key=lambda kv: (kv[1], kv[0]), reverse=True)
    }


def main():
    ovoxo_songs = get_songs_from_playlist(SPOTIFY_JSON)
    ovoxo_playlist = Playlist(ovoxo_songs)
    ovoxo_recommender = Recommender(ovoxo_playlist)

    print(ovoxo_recommender.reccommend_songs())


async def test_analysis():
    ovoxo_song = get_songs_from_playlist(SPOTIFY_JSON)[0]
    ovoxo_song_analysis = await ovoxo_song.get_song_analysis()
    print(ovoxo_song_analysis)


if __name__ == "__main__":
    # main()

    asyncio.run(test_analysis())
