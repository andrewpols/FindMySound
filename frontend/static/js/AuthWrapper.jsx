import {getUTCTimestamp, useUser} from "./UserContext.jsx";
import {useEffect, useRef} from "react";
import {useLocation, useNavigate} from "react-router-dom";

import axios from "axios";


export default function AuthWrapper({children}) {
    const {user, setUser, isLoggedIn, isLoading} = useUser();

    const hasFetched = useRef(false);

    const minutes_to_ms = (minutes) => {
        return minutes * 60 * 1000
    }

    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const currentTimestamp = getUTCTimestamp();
        const timeUntilRefresh = minutes_to_ms(0.1)
        const timestampUntilRefresh = getUTCTimestamp(user?.spotify_profile?.last_synced) + timeUntilRefresh;

        const hydrateUserInfo = async () => {
            const reauthTriggered = await updateUserDetails(hasFetched, navigate, setUser, location);
            if (!reauthTriggered) {
                await getSpotifyPlaylists(navigate, setUser, location);
            }

        }

        if (isLoading || !isLoggedIn || !user?.spotify_profile) return;

        else if (currentTimestamp > timestampUntilRefresh) {
            hydrateUserInfo();
        }
    }, [isLoading]);

    return children;
}

export async function updateUserDetails(hasFetched, navigate, setUser, location) {

    console.log('hydrating')
    try {
        hasFetched.current = true;

        const accessToken = localStorage.getItem("accessToken")

        const config = {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        }

        const response = await axios.put("/api/update-spotify-details", {}, config);

        console.log(response)

        setUser((user) => ({
            ...user,
            spotify_profile: {
                ...user?.spotify_profile,
                spotify_username: response.data?.spotify_username,
                spotify_profile_image: response.data?.spotify_profile_image,
                spotify_id: response.data?.spotify_id
            }
        }));

        return false // reauth not needed

    } catch (error) {
        if (error.response.data.reauth_required) {
            navigate("/FindMySound/accounts/authorize", {state: {from: location.pathname}});
            return true // reauth needed
        }
    } finally {
        hasFetched.current = false;
    }
}

// Retrieves and saves user's spotify playlists
export async function getSpotifyPlaylists(navigate, setUser, location) {
    try {

        const accessToken = localStorage.getItem("accessToken")

        const config = {
            headers: {
                "Authorization": `Bearer ${accessToken}`
            }
        }

        const response = await axios.post("/recommender/playlists", {}, config);

        setUser((user) => ({
            ...user,
            spotify_profile: {
                ...user?.spotify_profile,
                user_playlists: response.data
            }
        }));

    } catch (error) {

        if (error.response.data.reauth_required) {
            navigate("/FindMySound/accounts/authorize", {state: {from: location.pathname}});
        }
    }
}
