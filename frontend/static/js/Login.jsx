import React, {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import axios from "axios";

import {useUser} from "./UserContext.jsx";

import "../styles/register.css";


export default function Login() {

    // Load isLoggedIn just for the purpose of redirecting if user is already logged in
    const {isLoggedIn, setIsLoggedIn, setUsername, isLoading} = useUser();
    const navigate = useNavigate();


    useEffect(() => {
        if (!isLoading && isLoggedIn) navigate("/FindMySound/")
    }, [isLoggedIn, isLoading])

    const [formData, setFormData] = useState(
        {
            'username': '',
            'password': '',
        }
    );

    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');


    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    }

    const handleSubmit = async () => {

        setIsSubmitLoading(true);

        const errorMsgMap = {
            'This field may not be blank.': 'Fields may not be blank.'
        }

        try {
            const response = await axios.post('/api/login/', formData);

            if (response && response.data) {
                localStorage.setItem('accessToken', response.data.tokens.access);
                localStorage.setItem('refreshToken', response.data.tokens.refresh);

                setIsLoggedIn(true);
                setUsername(response.data.username)

                navigate("/FindMySound/");
            }

        } catch (error) {
            let errorToAdd;


            if (error.response && error.response.data && Object.prototype.toString.call(error.response.data) === '[object Object]') {
                Object.keys(error.response.data).forEach((errorKey) => {
                    const errorMessages = error.response.data[errorKey]

                    if (errorMessages && errorMessages.length > 0) {
                        errorToAdd = errorMsgMap[errorMessages[0]] || errorMessages[0]
                    }
                })
            } else {
                errorToAdd = `STATUS: ${error.status}. Error occured during login.`
            }

            setErrorMsg(errorToAdd);

        } finally {
            setIsSubmitLoading(false);
        }


    }

    const loginComponent =
        <>
            { errorMsg && <p style={{color: "red"}}>{errorMsg}</p> }
            <h2>
                Login
            </h2>

            <form>
                <label>Username</label> <br/>
                <input type="text" name="username" onChange={handleChange} autoComplete="off"/>
                <br/>

                <label>Password</label> <br/>
                <input type="password" name="password" onChange={handleChange}/>
                <br/>
            </form>

            <button id="submit-btn" onClick={handleSubmit} disabled={isSubmitLoading}>Submit</button>
        </>;

    return (
        <>
            {
                !isLoggedIn && loginComponent
            }
        </>
    );
}
