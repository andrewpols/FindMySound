import React from "react";
import {BrowserRouter, Routes, Route} from "react-router-dom";

import UserProvider from "./UserContext.jsx"

import Home from "./Home.jsx";
import Register from "./Register.jsx";
import Login from "./Login.jsx";
import Logout from "./Logout.jsx";
import Layout from "./Layout.jsx";
import AuthorizationRequest, {LinkUserSpotify} from "./ExternalAccounts.jsx";
import Profile from "./Profile.jsx";
import Recommender from "./Recommender.jsx";
import Error from "./Error.jsx";
import Results from "./Results.jsx";

import '../styles/App.css'
import AuthWrapper from "./AuthWrapper.jsx";


export function MainRoutes() {

    return (
        <BrowserRouter>
            <Routes>
                <Route path="/FindMySound/" element={<Layout/>}>

                    <Route index element={
                        <AuthWrapper> <Home/> </AuthWrapper>
                    }/>

                    <Route path="signup/" element={<Register/>}/>
                    <Route path="login/" element={<Login/>}/>
                    <Route path="logout/" element={<Logout/>}/>
                    <Route path="accounts/authorize" element={<AuthorizationRequest/>}/>
                    <Route path="accounts/authenticate" element={<LinkUserSpotify/>}/>

                    <Route path="profile" element={
                        <AuthWrapper> <Profile/> </AuthWrapper>
                    }/>

                    <Route path="music/select" element={
                        <AuthWrapper> <Recommender/> </AuthWrapper>
                    }/>

                    <Route path="music/results" element={
                        <Results/>
                    }/>

                    <Route path="*" element={<Error manualError={"Error 404: Page not found."}/>}/>
                    <Route path="error" element={<Error/>}/>
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

function App() {

    return (
        // Provides context for MainRoutes to subscribe to
        <UserProvider>
            <MainRoutes/>
        </UserProvider>
    );
}

export default App
