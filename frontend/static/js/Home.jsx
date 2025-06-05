import React, {useEffect} from "react";

import {useUser} from "./UserContext.jsx"

export function NotLoggedIn() {

    return (
        <div>
            Not logged in...
        </div>
    );
}

export function LoggedIn({username}) {
    return (
        <div>
            Hello, {username}. You are logged in.
        </div>
    );
}


export default function Home() {

    const { isLoggedIn, username} = useUser();

    return (
        <h2 id="home">
            {
                isLoggedIn ?
                    <LoggedIn username={username}/> :
                    <NotLoggedIn/>
            }
        </h2>
    );
}
