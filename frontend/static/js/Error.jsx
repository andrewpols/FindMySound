import React, {useEffect, useState} from "react";
import {useLocation} from "react-router-dom";

export default function Error({manualError}) {

    const {state} = useLocation();
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        let error;
        if (state) {
            error = state.error;
        }
        error ? setErrorMsg(error) : setErrorMsg("ERROR 404: Page Not Found");
    }, [])

    return (
        <>
            <div style={{display: "flex", alignItems: "center", justifyContent: "center", margin: "auto", height: "calc(100vh - 210px)"}}>
                <h1>
                    {manualError || errorMsg}
                </h1>
            </div>
        </>
    )
}
