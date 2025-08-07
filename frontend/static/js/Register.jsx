import React from 'react';
import {useState, useEffect} from 'react';
import {Link, useNavigate} from "react-router-dom";
import axios from 'axios';

import {getUTCTimestamp, useUser} from "./UserContext.jsx";

import "../styles/register.css"
import AuthWrapper from "./AuthWrapper.jsx";


export default function Register() {

    // If user already logged in, we route them to main page instead of the sign-up page.
    // Loading isLoggedIn is purely for the purpose of checking if we should let the user proceed in signing up.
    const {isLoggedIn, isLoading, setIsLoggedIn, setUser} = useUser()
    const navigate = useNavigate()

    useEffect(() => {

        if (!isLoading && isLoggedIn) navigate("/FindMySound/music/select")

    }, [isLoggedIn, isLoading])

    const [formData, setFormData] = useState(
        {
            'username': '',
            'email': '',
            'password1': '',
            'password2': ''
        }
    );

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    }


    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (isSubmitLoading) {
            return
        }

        setIsSubmitLoading(true);
        setErrorMsg("");

        try {
            const response = await axios.post('/api/signup/', formData);

            const userInfo = response.data.user

            setIsLoggedIn(true);
            setUser(userInfo);

            localStorage.setItem('accessToken', response.data.tokens.access);
            localStorage.setItem('refreshToken', response.data.tokens.refresh);

            navigate("/FindMySound/music/select");

        } catch (error) {

            const msgMap = {
                'This field may not be blank.': 'Fields may not be blank.'
            }

            let errorToAdd;

            Object.keys(error?.response?.data)?.forEach(errorKey => {
                const errorMessages = error.response.data[errorKey]

                if (errorMessages && errorMessages.length > 0) {
                    errorToAdd = msgMap[errorMessages[0]] || errorMessages[0]
                }
                setErrorMsg(errorToAdd);
            })

            setErrorMsg(errorToAdd);

        } finally {
            setIsSubmitLoading(false);
        }
    }

    const registerComponent =
        <>
            <h2>
                Sign Up
            </h2>

            {errorMsg && <p style={{color: "red"}}>{errorMsg}</p>}
            <form name="register-form">
                <label>Username</label> <br></br>
                <input name="username" type="text" value={formData.username} onChange={handleChange} autoComplete="off">
                </input>
                <br></br>

                <label>Email</label> <br></br>
                <input name="email" type="text" value={formData.email} onChange={handleChange} autoComplete="off">
                </input>
                <br></br>

                <label>Password</label> <br></br>
                <input name="password1" type="password" value={formData.password1} onChange={handleChange}
                       autoComplete="off">
                </input>
                <br></br>

                <label>Confirm Password</label> <br></br>
                <input name="password2" type="password" value={formData.password2} onChange={handleChange}
                       autoComplete="off">
                </input>
                <br></br>
            </form>

            <button id="submit-btn" type="submit" onClick={handleSubmit} disabled={isSubmitLoading}>
                Submit
            </button>

            <Link className="sign-up-route" to="/FindMySound/login">Already have an account? Log In Here.</Link>

        </>;

    return (
        <>
            <div id="register-div">
                {!isLoggedIn && registerComponent}
            </div>
        </>
    );
}
