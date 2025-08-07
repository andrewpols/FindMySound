import React from "react";
import {Link} from "react-router-dom";

import {useUser} from "./UserContext.jsx"

import "../styles/home.css";

import kisslandAlbumArt from "../img/kissland.png";
import thaCarterIVAlbumArt from "../img/tha-carter-iv.jpg";
import ctrlAlbumArt from "../img/sza-ctrl.png";

import soMuchFunAlbumArt from "../img/Young_Thug_-_So_Much_Fun.png";
import xEdAlbumArt from "../img/x-ed-sheeran.png";
import theEndAlbumArt from "../img/the-end-cover.png";

import fmsNoTextLogo from "/FindMySound-notext.svg";

import {DotLottieReact} from "@lottiefiles/dotlottie-react";
import welcomeLottie from "../lottie/logo.lottie?url";

import {gsap} from "gsap";
import {useGSAP} from "@gsap/react";
import {ScrollTrigger} from "gsap/ScrollTrigger";
import {MotionPathPlugin} from "gsap/MotionPathPlugin";
import {MotionPathHelper} from "gsap/MotionPathHelper";

gsap.registerPlugin(useGSAP, ScrollTrigger, MotionPathPlugin, MotionPathHelper);


export function NotLoggedIn() {

    return (
        <>
            {/*<h2 style={{fontWeight: 400, fontSize: "2.5rem"}}>hello, andrewpols.</h2>*/}
        </>
    );
}

export function LoggedIn({user}) {


    return (
        <>
            <h2 style={{fontWeight: 400, fontSize: "2.5rem"}}>hello, {user?.username}.</h2>
        </>
    );
}


export default function Home() {

    const {isLoggedIn, user} = useUser();


    useGSAP(() => {

            gsap.to("#mouse-scroll-btn", {
                opacity: 0,
                scrollTrigger: {
                    trigger: "#mouse-scroll-btn",
                    start: "top 40%",
                    toggleActions: "play none none reverse"
                }
            })

            gsap.to(".shine", {
                left: "200%",
                top: "5%",
                opacity: 0.85,
                duration: 3.2,
                ease: "power1.inOut",
                onStart: () => gsap.set(".shine", {opacity: 0.8}),
                repeat: -1,
                repeatDelay: 1.4,
            })

            /////////
            const pauseTimestamp = 0.3;

            let album1Timeline = gsap.timeline({
                scrollTrigger: {
                    trigger: "#trilogy-box",
                },
                repeat: -1,
                repeatDelay: 2,
            });

            album1Timeline
                // // PHASE 1:
                .to("#trilogy-box", {
                    motionPath: {
                        path: "#motion-path1",
                        align: "#motion-path1",
                        alignOrigin: [0.5, 0.5],
                        start: 0,
                        end: pauseTimestamp,
                    },
                    opacity: 1,
                    ease: "power1.inOut",
                    duration: 0.8,
                }, "<")
                .to("#trilogy-box3", {
                    motionPath: {
                        path: "#motion-path3",
                        align: "#motion-path3",
                        alignOrigin: [0.5, 0.5],
                        start: 0,
                        end: pauseTimestamp
                    },
                    opacity: 1,
                    ease: "power1.inOut",
                    duration: 0.8,
                }, "<0.1")
                .to("#trilogy-box2", {
                    motionPath: {
                        path: "#motion-path2",
                        align: "#motion-path2",
                        start: 0,
                        end: pauseTimestamp,
                        alignOrigin: [0.5, 0.5]
                    },
                    opacity: 1,
                    ease: "power1.inOut",
                    duration: 0.8,

                }, "<0.1")

                .to("#trilogy-box", {duration: 1.5}) // pause timeline for n seconds


                // PHASE 2:
                .to("#trilogy-box", {
                    motionPath: {
                        path: "#motion-path1",
                        align: "#motion-path1",
                        start: pauseTimestamp,
                        end: 1,
                        alignOrigin: [0.5, 0.5],
                    },
                    ease: "power1.in",
                    duration: 1.2,
                }, "P2-start")
                .to("#trilogy-box",
                    {
                        opacity: 0,
                    },
                    "P2-start>")
                .to("#trilogy-box2", {
                    motionPath: {
                        path: "#motion-path2",
                        align: "#motion-path2",
                        start: pauseTimestamp,
                        end: 1,
                        alignOrigin: [0.5, 0.5],
                    },
                    ease: "power1.in",
                    duration: 1,
                }, "P2-start+=0.35")
                .to("#trilogy-box2",
                    {
                        opacity: 0,
                        duration: 0
                    },
                    "P2-start+=1.40")
                .to("#trilogy-box3", {
                    motionPath: {
                        path: "#motion-path3",
                        align: "#motion-path3",
                        alignOrigin: [0.5, 0.5],
                        start: pauseTimestamp,
                        end: 1
                    },
                    ease: "power2.in",
                    duration: 1.3,
                }, "P2-start+=0.3")
                .to("#trilogy-box3", {
                    opacity: 0
                }, ">")



                // // PHASE 3:
                .to(".motion-path", {
                    stroke: "rgba(0, 255, 175, 0.5)",
                    filter: "drop-shadow(0px 0px 10px #ffffff)",
                    duration: 0.1,
                    ease: "power1.out",
                    repeat: 3,
                    repeatDelay: 0.05,
                }, "P2-start+=1.3")


                .to("#trilogy-box4", {
                    motionPath: {
                        path: "#motion-path4",
                        align: "#motion-path4",
                        alignOrigin: [0.5, 0.5],
                        start: 0,
                        end: 0.75,
                    },
                    duration: 1.5,
                    ease: "power3.out",
                }, "P2-start+=1.3")
                .to("#trilogy-box5", {
                    motionPath: {
                        path: "#motion-path4",
                        align: "#motion-path4",
                        alignOrigin: [0.5, 0.5],
                        start: 0,
                        end: 0.55
                    },
                    duration: 1.3,
                    ease: "power3.out",
                }, "<0.1")
                .to("#trilogy-box6", {
                    motionPath: {
                        path: "#motion-path4",
                        align: "#motion-path4",
                        alignOrigin: [0.5, 0.5],
                        start: 0,
                        end: 0.35
                    },
                    duration: 1.1,
                    ease: "power3.out",
                }, "<0.2")

                // PHASE 4: Leaving
                .to("#trilogy-box6", {
                    motionPath: {
                        path: "#motion-path4",
                        align: "#motion-path4",
                        alignOrigin: [0.5, 0.5],
                        start: 0.35,
                        end: 1
                    },
                    duration: 2,
                    ease: "power3.inOut",
                }, "+=1.4")
                .to("#trilogy-box5", {
                    motionPath: {
                        path: "#motion-path4",
                        align: "#motion-path4",
                        alignOrigin: [0.5, 0.5],
                        start: 0.55,
                        end: 1
                    },
                    duration: 1.68,
                    ease: "power3.inOut",
                }, "<0.25")
                .to("#trilogy-box4", {
                    motionPath: {
                        path: "#motion-path4",
                        align: "#motion-path4",
                        alignOrigin: [0.5, 0.5],
                        start: 0.75,
                        end: 1
                    },
                    duration: 1.82,
                    ease: "power3.inOut",
                }, "<")
                .to(".motion-path", {
                    stroke: "rgba(6, 46, 13, 0.35)",
                    filter: "none",
                    duration: 0.9,
                    ease: "power1.out"
                }, "<0.5")
                .fromTo(["#trilogy-box4", "#trilogy-box5"],
                    {
                        opacity: 1,
                    },
                    {
                        opacity: 0,
                        duration: 1,
                    },
                    "<0.3")
                .to("#trilogy-box6", {
                    opacity: 0,
                    duration: 0.5
                }, ">-0.5")


            ///////////

            // fade in explanation section when it scrolls in
            gsap.from("#explanation-container", {
                y: 100,
                opacity: 0,
                duration: 1,
                scrollTrigger: {
                    trigger: "#explanation-container",
                    start: "top 75%",
                    toggleActions: "play none none reverse",
                }
            });

            const handleButtonScroll = () => {
                const explanationContainer = document.getElementById("explanation-container");
                const targetY = explanationContainer.getBoundingClientRect().top - 200;

                window.scrollTo(window.scrollX, targetY, {behavior: "smooth"});
            }


            document.getElementById("mouse-scroll-btn").addEventListener("click", handleButtonScroll)
        }, []
    )


    return (
        <div id="smooth-wrapper">
            <div id="smooth-content">

                <div id="content-wrapper">
                    <section id="welcome-container" className="panel">
                        <div className="container">
                            <div id="welcome-msg">

                                {isLoggedIn &&
                                    <h2 style={{fontWeight: 400, fontSize: "2.5rem"}}>hello {user?.username},</h2>}

                                <h1 id="welcome-header">welcome {isLoggedIn && "back"} to</h1>

                                <DotLottieReact
                                    src={welcomeLottie}
                                    autoplay

                                    className="welcome-lottie"
                                />

                                <h2 style={{
                                    marginTop: "20px",
                                    marginBottom: "0",
                                    fontSize: "1.6rem",
                                    color: "#c8c8c8"
                                }}>
                                    Simplify your music discovery experience.
                                </h2>

                            </div>

                            <button id="mouse-scroll-btn">
                                <div className="mouse_scroll">
                                    <div className="mouse">
                                        <div className="wheel"></div>
                                    </div>
                                    <div>
                                        <span className="m_scroll_arrows unu"></span>
                                        <span className="m_scroll_arrows doi"></span>
                                        <span className="m_scroll_arrows trei"></span>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </section>


                    <section id="explanation-container" className="panel">
                        <div className="container">
                            <h1>your music taste,</h1>
                            <h1>your songs,</h1>
                            <h1 style={{fontWeight: 600}}>our curated recommendations.</h1>
                            <p style={{maxWidth: 500, textAlign: "center", margin: "auto", marginTop: 30}}
                               id="explanation-scroll">
                                FindMySound analyzes your favourite songs and generates a curated playlist fit to your
                                taste.
                            </p>

                            <div className="motion-wrapper">
                                <div id="trilogy-box" className="album-art-box">
                                    <img src={kisslandAlbumArt} alt="trilogy-album-art"/>
                                </div>

                                <svg className="motion-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <path
                                        id="motion-path1" className="motion-path"
                                        d="M141.599,-81.573 C177.819,-65.55 528.248,132.514 556.695,139.517 591.397,148.037 731.421,145.456 756.207,146.511"
                                    />
                                </svg>
                            </div>

                            <div className="motion-wrapper">
                                <div id="trilogy-box2" className="album-art-box">
                                    <img src={ctrlAlbumArt} alt="trilogy-album-art"/>
                                </div>

                                <svg className="motion-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <path
                                        id="motion-path2" className="motion-path"
                                        d="M136.38901,443.52199 C190.97601,410.56899 518.85801,231.84399 542.77501,224.74599 565.82601,217.90499 702.15601,217.76999 741.77001,218.18499 "
                                    />
                                </svg>
                            </div>


                            <div className="motion-wrapper">
                                <div id="trilogy-box3" className="album-art-box">
                                    <img src={thaCarterIVAlbumArt} alt="trilogy-album-art"/>
                                </div>

                                <svg className="motion-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <path
                                        id="motion-path3" className="motion-path"
                                        d="M114.3,183.654 C149.46,182.976 733.799,179.04 764.799,179.04"
                                    />
                                </svg>
                            </div>

                            <div className="motion-wrapper">
                                <svg className="motion-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <path
                                        className="motion-path"
                                        d="M140.6,39.703 C196.449,55.555 525.688,159.61 549.02,160.496 578.313,161.608 710.549,161.171 741.556,161.171"/>
                                </svg>
                            </div>


                            <div className="motion-wrapper">
                                <svg className="motion-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <path
                                        className="motion-path"
                                        d="M124.986,325.772 C168.001,312.323 509.793,209.416 532.513,204.062 553.097,199.214 698.873,198.715 729.892,198.715"
                                    />
                                </svg>
                            </div>

                            <div className="motion-wrapper">
                                <div id="trilogy-box4" className="album-art-box">
                                    <img src={soMuchFunAlbumArt} alt="trilogy-album-art"/>
                                </div>

                                <svg className="motion-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <path
                                        id="motion-path4" className="motion-path"
                                        d="M756.217,180.625 C810.996,180.915 1425.933,177.953 1478.739,177.953"
                                    />
                                </svg>
                            </div>

                            <div className="motion-wrapper">
                                <div id="trilogy-box5" className="album-art-box">
                                    <img src={xEdAlbumArt} alt="trilogy-album-art"/>
                                </div>

                                <svg className="motion-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <path
                                        id="motion-path4" className="motion-path"
                                        d="M756.217,180.625 C810.996,180.915 1425.933,177.953 1478.739,177.953"
                                    />
                                </svg>
                            </div>

                            <div className="motion-wrapper">
                                <div id="trilogy-box6" className="album-art-box">
                                    <img src={theEndAlbumArt} alt="trilogy-album-art"/>
                                </div>

                                <svg className="motion-svg" viewBox="0 0 800 300" preserveAspectRatio="none">
                                    <path
                                        id="motion-path4" className="motion-path"
                                        d="M756.217,180.625 C810.996,180.915 1425.933,177.953 1478.739,177.953"
                       t             />
                                </svg>
                            </div>

                            <div id="logo-transform">
                                <div className="shine"></div>
                                <img src={fmsNoTextLogo} alt="find-my-sound"/>
                            </div>
                        </div>

                        <button className="get-started-btn">
                            <Link
                                to={isLoggedIn ? "/FindMySound/music/select" : "/FindMySound/login"}>
                                Get Started
                            </Link>
                        </button>
                    </section>
                </div>

            </div>

        </div>
    );
}
