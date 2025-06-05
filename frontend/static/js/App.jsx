import React from "react";
import {BrowserRouter, Routes, Route} from "react-router-dom";

import UserProvider from "./UserContext.jsx"

import Home from "./Home.jsx";
import Register from "./Register.jsx";
import Login from "./Login.jsx";
import Logout from "./Logout.jsx";
import Layout from "./Layout.jsx";
import AuthorizationRequest, {AccessTokenRequest} from "./ExternalAccounts.jsx";
import Error404 from "./Error.jsx";


import '../styles/App.css'

export function MainRoutes() {
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/FindMySound/" element={<Layout />}>
                    <Route index element={<Home />} />
                    <Route path="signup/" element={<Register />} />
                    <Route path="login/" element={<Login />} />
                    <Route path="logout/" element={<Logout />} />
                    <Route path="accounts/authorize" element={<AuthorizationRequest />} />
                    <Route path="accounts/authenticate" element={<AccessTokenRequest />} />

                    <Route path="*" element={<Error404 />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}


function App() {

    return (
        // Provides context for MainRoutes to subscribe to
        <UserProvider>
            <MainRoutes />
        </UserProvider>
    );
}

export default App
