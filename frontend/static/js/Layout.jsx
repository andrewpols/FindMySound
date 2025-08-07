import React, {useState, useEffect} from "react";
import {Outlet, Link} from "react-router-dom";

import {useUser} from "./UserContext.jsx"

import "../styles/layout.css"
import fmsLogo from "/FindMySound.svg";
import defaultProfile from "../img/Default_pfp.svg"
import linkedInSVG from "../img/iconmonstr-linkedin-3.svg";
import githubSVG from "../img/github-mark.svg";

export function DropdownInfo({menuItems}) {
    return (
        <div>
            <ul className="dropdown-menu">
                {
                    menuItems.map(
                        (Component) => (
                            Component
                        )
                    )
                }
            </ul>
        </div>
    );
}


// Not entirely necessary, but streamlines the process of repeating these components 2-3 times in profileButtons
export function ButtonLinkComponent({buttonText, linkPath}) {
    return (
        <Link to={`/FindMySound/${linkPath}`} className="nav-btn">{buttonText}</Link>
    );
}

export function ButtonLinkDropdownComponent({buttonText, linkPath, order}) {
    return (
        <Link to={`/FindMySound/${linkPath}`} className={`${order}-dropdown-btn`}>{buttonText}</Link>
    );
}

export function ButtonDropdownComponent({profileImg, isLoading, menuItems = []}) {

    const [showProfile, setShowProfile] = useState(false);

    const handleClick = (event) => {
        if (showProfile === true) {
            setShowProfile(false);
            document.getElementById('profile-img').style.filter = '';
        } else if (event.target.id === "profile-btn" || event.target.id === "profile-img") {
            setShowProfile(true);

            if (!profileImg && !isLoading) {
                document.getElementById('profile-img').style.filter = 'brightness(0) saturate(100%) invert(29%) sepia(95%) saturate(800%) hue-rotate(103deg) brightness(103%) contrast(83%)';
            }

        }
    }


    // Only consider clicks when showProfile changes
    // ...(By mounting an initial eventListener and removing on dependency [i.e. showProfile] change)
    useEffect(() => {

        document.body.addEventListener('click', handleClick)

        return () => {
            document.body.removeEventListener('click', handleClick)
        }


    }, [showProfile]);

    return (
        <div className="button-dropdown">
            <button className="nav-btn" id="profile-btn">
                {
                    profileImg ?
                        <img src={profileImg} alt='profile image' id="profile-img" className="custom"/> :
                        <img src={defaultProfile} alt='profile image' id="profile-img" className="default"/>
                }
            </button>
            {showProfile && <DropdownInfo menuItems={menuItems}/>}
        </div>
    );
}

export default function Layout() {
    const {isLoggedIn, user, isLoading} = useUser();

    const mapInfoToButtons = (componentsArray, Button, map, requiresLogIn) => {
        /*
        * Take in a map of ~Button Text to Properties~ and populate <componentsArray> based on the given Button class.
        *
        */
        Object.keys(map).forEach((compText, i) => {
                const compInfo = map[compText];

                if (compInfo.loggedIn === requiresLogIn || compInfo.loggedIn === null) {

                    if (Button.prototype.constructor.name === "ButtonLinkDropdownComponent") {
                        let order;
                        const mapLength = Object.keys(map).length;

                        switch (true) {
                            case (i === 1):
                                order = "first";
                                break;
                            case (i === mapLength - 1):
                                order = "last";
                                break;
                            default:
                                order = "middle";
                        }


                        componentsArray.push(
                            <Button key={i} buttonText={compText} linkPath={compInfo.path} order={order}/>
                        )

                    } else if (Button.prototype.constructor.name === "ButtonLinkComponent") {
                        componentsArray.push(
                            <Button key={i} buttonText={compText} linkPath={compInfo.path}/>
                        )
                    }
                }

            }
        )
    }


    const profileBtnsMap = {
        "Log In": {path: "login", loggedIn: false},

        "Profile": {path: "profile", loggedIn: true},
        "Log Out": {path: "logout", loggedIn: true},
    }

    const profileButtonsLoggedOut = [];
    mapInfoToButtons(profileButtonsLoggedOut, ButtonLinkDropdownComponent, profileBtnsMap, false);

    const profileButtonsLoggedIn = [];
    mapInfoToButtons(profileButtonsLoggedIn, ButtonLinkDropdownComponent, profileBtnsMap, true)

    const profileButtons = isLoggedIn ? profileButtonsLoggedIn : profileButtonsLoggedOut;


    const navBarMap = {
        "Home": {path: "", loggedIn: null},
        "Sign Up": {path: "signup", loggedIn: false},
        "Log In": {path: "login", loggedIn: false},
        "My Music": {path: isLoggedIn ? "music/select" : "signup", loggedIn: true},
    }

    const navButtonsLoggedOut = [];
    mapInfoToButtons(navButtonsLoggedOut, ButtonLinkComponent, navBarMap, false)

    const navButtonsLoggedIn = [];
    mapInfoToButtons(navButtonsLoggedIn, ButtonLinkComponent, navBarMap, true)

    const navBarButtonsArray = isLoggedIn ? navButtonsLoggedIn : navButtonsLoggedOut;

    const navBarButtons =
        <>
            {
                navBarButtonsArray.map((navBarBtn) => (
                        navBarBtn
                    )
                )
            }
        </>


    return (
        <>

            <div id="page-container">
                <div id="header">
                    <nav>
                        <div>
                            <Link to="/FindMySound/">
                                <img id="logo" src={fmsLogo} alt="Logo"></img>
                            </Link>
                        </div>
                        <ul>

                            {navBarButtons}

                            <ButtonDropdownComponent profileImg={user?.spotify_profile?.spotify_profile_image}
                                                     isLoading={isLoading}
                                                     menuItems={profileButtons}/>

                        </ul>
                    </nav>
                    <hr id="divider"></hr>
                </div>

                {/*This is essentially the "parent" route. Layout is always active. The Outlet tag below ensures that
                everything which is wrapped by Layout gets rendered as a child. So, its always "Layout + <some other route>"
                where <some other route> is the child route of Layout:

                <BrowserRouter>
                <Routes>
                    <Route path="/FindMySound/" element={<Layout/>}>

                        <Route index element={
                            <AuthWrapper> <Home/> </AuthWrapper>
                        }/>
                 .... ETC

                 Notice how everything is wrapped by Layout!
                */}


                <div id="main-content">
                    <Outlet/>
                </div>

                <footer id="footer">
                    <p id="copyright">&copy; 2025 Andrew Pols. All Rights Reserved.</p>


                    <div id="pols-external-container">
                        <a href="http://linkedin.com/in/andrewpols" target="_blank" id="pols-external-route">
                            <div>
                                <img id="pols-external-img" src={linkedInSVG} alt="linked-in"/>
                                LinkedIn
                            </div>
                        </a>

                        <a href="http://github.com/andrewpols" target="_blank" id="pols-external-route">
                            <div>
                                <img id="pols-external-img" src={githubSVG} alt="github"/>
                                GitHub
                            </div>
                        </a>
                    </div>
                </footer>
            </div>

        </>
    );
}
