import React, {useEffect, useRef, useState} from "react";
import axios from "axios";

import {getUTCTimestamp, useUser} from "./UserContext.jsx";
import {useNavigate} from "react-router-dom";

import "../styles/recommender.css";
import defaultAlbumArt from "/default-album-art.png";

import {DotLottieReact} from '@lottiefiles/dotlottie-react';
import {getCurrentUserScope} from "./ExternalAccounts.jsx";

export default function Recommender() {

    /*
    * Get user playlists (containing name, image, ... of playlist) from backend --> frontend
    * Display them on this page.
    * Have the user choose which playlists to use in the recommendation.
    *
    * Run recommender in backend. Display results on this page.
    * Give an option to make as a playlist in spotify.
    * Done!
    */

    const {isLoggedIn, setIsLoggedIn, user, setUser, isLoading, setIsLoading} = useUser();
    const navigate = useNavigate();

    const spotifyTokenExpiryTimestamp = getUTCTimestamp(user?.spotify_profile?.access_token_expiry);
    const currentTimestamp = getUTCTimestamp()

    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {

        if (isLoading) return;

        if (!isLoggedIn) {
            navigate("/FindMySound/login");
        }

        if (!user.spotify_profile || currentTimestamp > spotifyTokenExpiryTimestamp || user?.spotify_profile.scopes_granted !== getCurrentUserScope()) {
            navigate("/FindMySound/accounts/authorize");
        }
    }, [isLoading]);

    const [formData, setFormData] = useState({});
    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [isResponseSuccessful, setIsResponseSuccessful] = useState(false);
    const [responseData, setResponseData] = useState();

    useEffect(() => {
        if (isResponseSuccessful) {
            localStorage.removeItem("spotifyPlaylistURL")
            navigate("/FindMySound/music/results", {state: {results: responseData}});
        }
    }, [isResponseSuccessful]);


    const handleSubmit = async () => {

        if (isSubmitLoading) return;

        setIsSubmitLoading(true);

        try {
            setErrorMsg('');

            const playlistsToSend = Object.keys(formData).filter((playlist) => (
                formData[playlist].checked === true
            )).map((playlist) => (
                {playlist_name: playlist, spotify_id: formData[playlist].spotify_id}
            ))

            const config = {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                }
            }
            const response = await axios.post("/recommender/find-music", playlistsToSend, config);

            if (response.status === 200) {
                setErrorMsg('');
                setResponseData(response.data?.tracks);
                setUser((user) => ({
                    ...user,
                    spotify_profile: response.data?.spotify_profile
                }))
                setIsResponseSuccessful(true);
            } else if (response.status === 204) {
                setErrorMsg("Pick at least one playlist to submit.")
            }

        } catch (error) {
            if (error?.response?.data?.reauth_required) {
                navigate("/FindMySound/accounts/authorize");
            }
        } finally {
            setIsSubmitLoading(false);
        }
    }

    const loadingComponent =
        <>
            {
                isSubmitLoading &&
                <DotLottieReact
                    src="https://lottie.host/aa6a32c6-0d06-4cd5-ae4c-bf2e210d64b4/wWvBqNpoHR.lottie"
                    loop
                    autoplay

                    className="loading-lottie"
                />
            }
        </>

    return (
        <>
            <div id="recommender-wrapper">
                <h2 id="playlists-header">My Playlists</h2>
                <p className="desc">
                    {isSubmitLoading ?
                        "Curating your recommendations..." :
                        "Select playlists to tailor your recommendation."
                    }
                </p>

                {
                    errorMsg && <p style={{"color": "red", "margin": "10px 0 0 0", "fontSize": "1.2rem"}}>{errorMsg}</p>
                }

                {loadingComponent}

                {
                    !isSubmitLoading &&
                    <div>
                        <form>
                            <div id="all-playlists-container">
                                {
                                    user?.spotify_profile?.user_playlists?.map((playlist) => (
                                        <PlaylistOption playlistName={playlist?.playlist_name}
                                                        playlistImage={playlist?.image_url}
                                                        setFormData={setFormData} playlistID={playlist?.spotify_id}
                                                        key={playlist?.spotify_id}/>
                                    ))
                                }
                            </div>
                        </form>

                        <button id="submit-btn" onClick={handleSubmit} disabled={isSubmitLoading}>
                            Submit
                        </button>
                    </div>
                }
            </div>

        </>
    );
}

export function PlaylistOption({playlistName, playlistImage, setFormData, playlistID}) {

    const handleChange = (e) => {
        setFormData((formData) => ({
            ...formData,
            [e.target.name]: {checked: e.target.checked, spotify_id: playlistID}
        }))
    }

    const truncate = (s, max = 50) => {
        if (s.length > max) {
            return s.slice(0, max) + "..."
        }

        return s
    }

    return (
        <div className="playlist-container">
            <p className="playlist-name">
                {truncate(playlistName, 15)}
            </p>

            {
                playlistImage ?
                    <img src={playlistImage} alt={`${playlistName}-image`} className="playlist-img"/> :
                    <img src={defaultAlbumArt} alt={`${playlistName}-image`} className="playlist-img"/>
            }

            <input type="checkbox" name={playlistName} onChange={handleChange} className="playlist-option"/>
        </div>
    );
}
