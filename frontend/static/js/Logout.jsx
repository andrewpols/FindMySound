import React, {useEffect} from "react";
import {useNavigate} from "react-router-dom";

import axios from "axios";

import {useUser} from "./UserContext.jsx";

export default function Logout() {
    const {isLoggedIn, setIsLoggedIn, setUser, isLoading} = useUser();

    const navigate = useNavigate();

    useEffect(() => {

        const requestLogout = async () => {

            const refreshToken = localStorage.getItem("refreshToken");
            const accessToken = localStorage.getItem("accessToken");

            const config = {
                headers: {
                    "Authorization": `Bearer ${accessToken}`
                }
            }

            // There should be a refresh token anyway since this is reached only by being logged in, but
            // this acts as another layer of protection.
            if (!refreshToken) {
                navigate("/FindMySound/");
            }

            try {
                await axios.post("/api/logout/", {"refresh": refreshToken}, config);

                localStorage.removeItem("refreshToken");
                localStorage.removeItem("accessToken");

                setIsLoggedIn(false);
                setUser(null);

                navigate("/FindMySound/");

            } catch (error) {
                navigate("/FindMySound/");
            }
        }

        // Prevents premature routing; forces out of useEffect until change in dependancy variables (isLoading / isLoggedIn) triggers useEffect again
        // SHOULD NOT ROUTE! This only acts as a barrier to execution until we've retrieved user context. Every other boundary can reroute (e.g. isLoggedIn, no refresh token, etc.).
        if (isLoading) return;

        if (!isLoggedIn) {
            navigate("/FindMySound/");
        } else {
            requestLogout()
        }

    }, [isLoggedIn, isLoading]) // Allows context to be loaded first before prematurely routing on mount

}
