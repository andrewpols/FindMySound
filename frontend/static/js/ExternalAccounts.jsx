import React from "react";
import {useNavigate, useSearchParams} from "react-router-dom";

import {Error403} from "./Error.jsx";

export default function AuthorizationRequest() {

    const state = crypto.randomUUID();
    sessionStorage.setItem("state", state)

    const scope = "playlist-read-private ugc-image-upload";

    const client_id = "d05dc3e9165b4799a8b5968578e81b61";
    const redirect_uri = "http://127.0.0.1:5173/FindMySound/accounts/authenticate";

    const params = new URLSearchParams({
            response_type: 'code',
            client_id: client_id,
            scope: scope,
            redirect_uri: redirect_uri,
            state: state
        });

    const authorizationRedirectURL = "https://accounts.spotify.com/authorize?" + params.toString();

    window.location.href = authorizationRedirectURL

}

export function AccessTokenRequest() {

    const [searchParams] = useSearchParams();

    const code = searchParams.get("code");
    const state = searchParams.get("state");


    if (state !== sessionStorage.getItem("state")) {
        return < Error403 />;
    } else {

        // SEMD CODE + STATE TO BACKEND

        return (
            <>
                <h1>WORKED</h1>
            </>
        );
    }

}
