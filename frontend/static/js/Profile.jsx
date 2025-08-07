import React, {useEffect} from "react";
import {useUser} from "./UserContext.jsx";
import {useNavigate, Link} from "react-router-dom";

import "../styles/profile.css";
import spotifyIcon from "../img/Primary_Logo_Green_CMYK.svg";

export default function Profile() {
    const {isLoggedIn, user, isLoading} = useUser();

    const spotifyProfile = user?.spotify_profile;

    const navigate = useNavigate();

    useEffect(() => {
        if (isLoading) return;

        if (!isLoggedIn) {
            navigate("/FindMySound/login");
        }
    }, [isLoading]);

    const linkAccountBtn =
        <>
            <button className="link-btn">
                <Link to="/FindMySound/accounts/authorize">Link Account</Link>
            </button>
        </>

    const linkedAccountText =
        <>
            <h2 className="link-txt">Account Linked</h2>
        </>



    return (<>
        <div id="root-container">
            <div className="card-row">
                <div className="user-info-card" id="profile-info">
                    <h1 id="username">{user?.username}</h1>
                    <div id="user-info">
                        <h2>email: {user?.email}</h2>
                    </div>
                </div>
                <div className="user-info-card" id="profile-info">
                    <h1 id="stats-header">Your Experience With <span className="find-my-sound">FindMySound</span></h1>
                    <div id="user-stats">
                        <h2>Songs Recommended: {spotifyProfile?.songs_recommended}</h2>
                        <h2>Playlists Created: {spotifyProfile?.playlists_created}</h2>
                        <h2>Artists Discovered: {spotifyProfile?.artists_discovered}</h2>
                    </div>
                </div>
            </div>

            <div className="user-info-card" id="linked-accounts-info">
                <h2>My Accounts</h2>
                <div className="account-details">
                    <div id="spotify-details">
                        <div className="img-name-container">
                            <img src={spotifyIcon} alt="spotify-icon" id="spotify-img"/>
                            {spotifyProfile?.spotify_username && <h2>{spotifyProfile.spotify_username}</h2>}
                        </div>
                        {
                            spotifyProfile ?
                                linkedAccountText:
                                linkAccountBtn
                        }
                    </div>
                </div>
            </div>
        </div>

    </>);
}
