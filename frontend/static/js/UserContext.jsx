import React, {createContext, useContext, useEffect, useState} from "react";
import axios from "axios";

export async function getUserData({setIsLoggedIn, setUser, setIsLoading}) {

    try {
        const accessToken = localStorage.getItem('accessToken');

        if (!accessToken) {
            setIsLoggedIn(false);
            setUser(null);
            setIsLoading(false);
            return
        }

        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }

        const response = await axios.get('/api/info/', config);

        const user = response.data;
        setIsLoggedIn(true);
        setUser(user);


        setIsLoading(false);

    } catch (error) {
        setIsLoggedIn(false);
        setUser(null);
        setIsLoading(false);
    }


}

export const UserContext = createContext({
    isLoggedIn: false,
    user: null,
    isLoading: true,
});


export default function UserProvider({children}) {

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getUserData({setIsLoggedIn, setUser, setIsLoading});
    }, []);


    return (
        <UserContext.Provider value={{
            isLoggedIn,
            setIsLoggedIn,
            user,
            setUser,
            isLoading,
            setIsLoading
        }}>
            {children}
        </UserContext.Provider>
    );
}

// Returns corresponding user context for other React components to easily call
export function useUser() {
    return useContext(UserContext);
}


export function getUTCTimestamp(datetime = '') {
    if (datetime && typeof datetime === "string") {
        try {
            return Date.parse(datetime);
        } catch (e) {
            return Date.now()
        }
    } else {
        return Date.now()
    }
}
