import React, {useState, useEffect} from "react";
import {Outlet, Link} from "react-router-dom";

import {useUser} from "./UserContext.jsx"

import "../styles/layout.css"
import fmsLogo from "/FindMySound.svg";
import defaultProfile from "../img/Default_pfp.svg"

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
        <button className="nav-btn">
            <Link to={`/FindMySound/${linkPath}`}>{buttonText}</Link>
        </button>
    );
}

export function ButtonLinkDropdownComponent({buttonText, linkPath, order}) {
    return (
        <button className={`${order}-dropdown-btn`}>
            <Link to={`/FindMySound/${linkPath}`}>{buttonText}</Link>
        </button>
    );
}

export function ButtonDropdownComponent({profileImg, text = 'Text', menuItems = []}) {

    const [showProfile, setShowProfile] = useState(false);

    const handleClick = (event) => {
        if (showProfile === true) {
            setShowProfile(false);
            document.getElementById('profile-img').style.filter = '';
        } else if (event.target.id === "profile-btn" || event.target.id === "profile-img") {
            setShowProfile(true);

            document.getElementById('profile-img').style.filter = 'brightness(0) saturate(100%) invert(29%) sepia(95%) saturate(800%) hue-rotate(103deg) brightness(103%) contrast(83%)';
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
                {profileImg ? <img src={profileImg} alt='profile image' id="profile-img"/> : text}
            </button>
            {showProfile && <DropdownInfo menuItems={menuItems}/>}
        </div>
    );
}

export default function Layout() {
    const userInfo = useUser();
    const isLoggedIn = userInfo.isLoggedIn;

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
                            case (i === 0):
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

        "Linked Accounts": {path: "accounts", loggedIn: true},
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
        "My Music": {path: isLoggedIn ? "accounts/authorize": "signup", loggedIn: true}
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
            <div id="header">
                <nav>
                    <div>
                        <Link to="/FindMySound/">
                            <img id="logo" src={fmsLogo} alt="Logo"></img>
                        </Link>
                    </div>
                    <ul>

                        {navBarButtons}

                        <ButtonDropdownComponent profileImg={defaultProfile}
                                                 menuItems={profileButtons}/>

                    </ul>
                </nav>
                <hr id="divider"></hr>
            </div>
            <Outlet/>
        </>
    );
}
