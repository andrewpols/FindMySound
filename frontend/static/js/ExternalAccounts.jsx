import React, {useEffect, useState, useRef} from "react";
import {useSearchParams, useNavigate, useLocation} from "react-router-dom";
import axios from "axios";

import {useUser, getUTCTimestamp} from "./UserContext.jsx";


export function getCurrentUserScope() {
    return "playlist-read-private " +
        "ugc-image-upload " +
        "user-read-private " +
        "playlist-modify-public ";
}

export default function AuthorizationRequest() {

    const navigate = useNavigate();

    const {isLoggedIn, user, setUser, isLoading} = useUser();
    const hasFetched = useRef(false);

    const scope = getCurrentUserScope();

    const {state} = useLocation(); // location = {path: ..., state: ..., etc.} {state} destructures into the variable state
    let from = state?.from || "/FindMySound/";

    const initiateSpotifyLink = () => {
        const state = crypto.randomUUID();
        sessionStorage.setItem("state", state);

        const client_id = "YOUR_SPOTIFY_APP_CLIENT_ID";
        const redirect_uri = "http://127.0.0.1:5173/FindMySound/accounts/authenticate";


        const params = new URLSearchParams({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state,
            show_dialog: true
        });

        if (from === "/FindMySound/signup" || from === "/FindMySound/login") {
            from = "/FindMySound/music/select";
        }

        const authorizationRedirectURL = "https://accounts.spotify.com/authorize?" + params.toString();

        localStorage.setItem("postAuthRedirect", from);

        window.location.href = authorizationRedirectURL;
    }


    const requestAuth = async () => {
        // First, try to refresh access token; if it fails, then just redirect back to Spotify OAuth to get new tokens
        try {
            const config = {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                }
            }


            const response = await axios.post("/api/refresh-spotify", {}, config);

            if (response.status === 200) {
                setUser((user) => ({
                    ...user,
                    spotify_profile: response.data
                }))

                navigate(from, {replace: true}); // replace makes it so this doesn't show up in user browser history
            }

        } catch (error) {

            if (error?.response?.data?.reauth_required) {
                hasFetched.current = true;

                initiateSpotifyLink();
            }
        }
    }

    useEffect(() => {

        if (isLoading || hasFetched.current) return;

        const tokenExpiryTimestamp = getUTCTimestamp(user?.spotify_profile?.access_token_expiry);
        const currentTimestamp = getUTCTimestamp();

        if (!isLoggedIn) {
            navigate("/FindMySound/");
        }
        // Route to music if access token isn't expired yet; don't want user to abuse OAuth requests to Spotify
        else if (currentTimestamp < tokenExpiryTimestamp && user?.spotify_profile?.scopes_granted === scope) {
            navigate(from, {replace: true});
        } else {
            requestAuth();
        }
    }, [isLoading])

}


export function LinkUserSpotify() {

    const {isLoggedIn, user, setUser, isLoading} = useUser();

    const [searchParams] = useSearchParams();
    const code = searchParams.get("code");
    const spotifyState = searchParams.get("state");

    const navigate = useNavigate();

    const [displayMsg, setDisplayMsg] = useState("");
    const hasFetched = useRef(false);

    const from = localStorage.getItem("postAuthRedirect") || "/FindMySound/";


    const requestUserSpotifyLink = async () => {

        hasFetched.current = true;

        try {
            const data = {"spotify_code": code, "current_scope": getCurrentUserScope()};

            const config = {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("accessToken")}`
                }
            }

            const response = await axios.put("/api/link-spotify", data, config);

            const spotifyInfo = response.data;

            localStorage.removeItem("postAuthRedirect");
            sessionStorage.removeItem("state")

            const minutes_to_ms = (minutes) => {
                return minutes * 60 * 1000
            }

            // This ensures that AuthWrapper triggers a refresh as the last sync will appear to be 5 minutes ago
            // We do this because this is the FIRST time the user links to Spotify, so we make it seem like the
            // last synced time stamp is stale so AuthWrapper triggers a refresh.
            const updatedSpotifyInfo = {
                ...spotifyInfo,
                last_synced: new Date(getUTCTimestamp() - minutes_to_ms(5)).toISOString() // timestamp to ISO string
            }

            setUser(user => ({
                ...user,
                spotify_profile: updatedSpotifyInfo
            }));

            navigate(from, {replace: true});

        } catch (error) {
            sessionStorage.removeItem("state")
            // i.e. access token expired AND refresh token expired; need to go through OAuth again
            if (error.response.data.reauth_required) {
                navigate("/FindMySound/accounts/authorize", {state: {from: from}});
            } else {
                setDisplayMsg(error.message);
            }

        }
    }

    useEffect(() => {

            if (isLoading || hasFetched.current) return;

            const tokenExpiryTimestamp = getUTCTimestamp(user?.spotify_profile?.access_token_expiry);
            const currentTimestamp = getUTCTimestamp();

            if (!isLoggedIn) {
                navigate("/FindMySound/");
            } else if (currentTimestamp < tokenExpiryTimestamp && user?.spotify_profile?.scopes_granted === getCurrentUserScope()) {
                navigate(from, {replace: true});
            } else if (spotifyState !== sessionStorage.getItem("state")) {
                sessionStorage.removeItem("state")
                navigate("/FindMySound/error", {state: {error: "Error 403: Forbidden"}});
            } else {
                requestUserSpotifyLink();
            }
        }, [isLoading]
    );


    return (
        <>
            {displayMsg && <h2>{displayMsg}</h2>}
        </>
    );

}
