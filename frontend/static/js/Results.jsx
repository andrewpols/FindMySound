import React, {useEffect, useState, useRef} from "react";
import {useLocation, useNavigate} from "react-router-dom";
import {useUser} from "./UserContext.jsx";
import {getSpotifyPlaylists} from "./AuthWrapper.jsx";

import axios from "axios";

import spotifyLogo from "../img/Primary_Logo_Green_CMYK.svg";
import externalImg from "../img/external-link-svgrepo-com.svg";
import defaultTrackArt from "/default-track-art.jpg";

import "../styles/results.css";


export default function Results() {

    const navigate = useNavigate();
    const {isLoggedIn, isLoading, user, setUser} = useUser();

    const {state} = useLocation();
    const [results, setResults] = useState([]);
    const hasFetched = useRef(false);
    const [shouldUpdateUser, setShouldUpdateUser] = useState(false);

    useEffect(() => {
        if (!isLoggedIn && !isLoading) {
            navigate("/FindMySound/login")
        } else if (state === null) {
            navigate("/FindMySound/music/select")
        } else {
            const {results} = state;

            setResults(results);
        }

        if (shouldUpdateUser && !hasFetched.current) {
            getSpotifyPlaylists(hasFetched, navigate, setUser);
            setShouldUpdateUser(false);
        }
    }, [isLoading, shouldUpdateUser]);

    console.log(results);
    console.log(user);

    const truncate = (s, max = 50) => {
        if (s.length > max) {
            return s.slice(0, max) + "..."
        }

        return s
    }

    const ms_to_minute_seconds = (ms) => {
        const minutesStr = (ms / 1000 / 60).toString();
        const decimalIndex = minutesStr.indexOf(".");
        const minutesTruncated = minutesStr.slice(0, decimalIndex)
        const seconds = parseFloat("0" + minutesStr.slice(decimalIndex, minutesStr.length)) * 60
        let secondsTruncated = Math.round(seconds)

        if (secondsTruncated < 10) {
            secondsTruncated = "0" + secondsTruncated.toString()
        }

        return `${minutesTruncated}:${secondsTruncated}`
    }


    window.addEventListener("scroll", () => {
        const scrollY = window.scrollY;
        const headerDiv = document.getElementById("header-container");

        if (!headerDiv) return;

        if (scrollY > 240) {
            headerDiv?.classList?.add("scrolled");
        } else {
            headerDiv?.classList?.remove("scrolled");
        }
    })

    const [isPlaylistLoading, setIsPlaylistLoading] = useState(false);

    const createSpotifyPlaylist = async () => {
        setIsPlaylistLoading(true);

        const spotifyPlaylistURL = localStorage.getItem("spotifyPlaylistURL");

        if (spotifyPlaylistURL) {
            window.open(spotifyPlaylistURL, '_blank');
            setIsPlaylistLoading(false);
        } else {
            const config = {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                }
            }


            try {
                const response = await axios.post("/recommender/create-playlist", results, config);

                const playlistURL = response.data.url;
                window.open(playlistURL, "_blank");
                localStorage.setItem("spotifyPlaylistURL", playlistURL);

                setShouldUpdateUser(true);

            } catch (error) {
                if (error?.response?.data?.reauth_required) {
                    navigate("/FindMySound/accounts/authorize");
                } else if (error.status === 500) {
                    const errorMsgs = error?.response?.data?.messages;

                    Object.keys(errorMsgs).forEach((key) => {
                        const errors = errorMsgs[key];

                        if (errors && errors.length > 0) {
                            navigate("/FindMySound/error", {state: {error: `ERROR ${error.status}: \n ${errors[0]}`}})
                        } else {
                            navigate("/FindMySound/error", {state: {error: "ERROR 500: Internal Server Error."}})
                        }
                    })

                }

            } finally {
                setIsPlaylistLoading(false);
            }
        }
    }



    return (
        <>
            <div id="results-wrapper">
                <div className="playlist-container-outer">

                    <div id="header-container">


                        <div id="header-text-row">
                            <h1 className="playlist-header">My Recommended Playlist</h1>
                            <button className="spotify-external-container" onClick={createSpotifyPlaylist}
                                    disabled={isPlaylistLoading}>
                                <img src={spotifyLogo} alt="spotify-logo" id="spotify-img"/>
                                <div>
                                    View in Spotify
                                    <span><img src={externalImg} alt="external-link" id="external-img"/></span>
                                </div>

                            </button>
                        </div>


                        <div id="header-info-row">
                            <div className="song-row" id="field-identifier-container">
                                <h3 className="song-number">#</h3>
                                <h3 className="album-art">Song</h3>
                                <h3 className="artist">Artist</h3>
                                <h3 className="album">Album</h3>
                                <h3 className="duration">Duration</h3>
                            </div>
                        </div>

                    </div>

                    <div className="playlist-container-inner">
                        <div className="playlist-info-container">
                            {
                                results.map((item, i) =>
                                    (i < 100 &&

                                        <div key={item?.isrc} className="song-row">
                                            <p className="song-number">{i + 1}</p>

                                            {
                                                // If no image url was found by spotify, we just send the default image.
                                                // Otherwise, if an image was found, display the correct album image.
                                                item?.image_url ?
                                                    <img src={item?.image_url} alt="album-art" className="album-art"/> :
                                                    <img src={defaultTrackArt} alt="album-art" className="album-art"/>

                                            }

                                            <p className="song-title">{truncate(item?.song_title)}</p>
                                            <p className="artist">{truncate(item?.artist?.artist_name, 16)}</p>
                                            <p className="album">{truncate(item?.album, 25)}</p>
                                            <p className="duration">{ms_to_minute_seconds(item?.duration)}</p>
                                        </div>
                                    )
                                )
                            }
                        </div>
                    </div>
                </div>
            </div>
        </>

    );
}
