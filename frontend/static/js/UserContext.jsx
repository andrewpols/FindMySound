import React, {createContext, useContext, useEffect, useState} from "react";
import axios from "axios";

export async function getUserData({setIsLoggedIn, setUsername, setIsLoading}) {

    try {
        const accessToken = localStorage.getItem('accessToken');

        if (!accessToken) {
            setIsLoggedIn(false);
            setUsername(null);
            setIsLoading(false);
            return
        }

        const config = {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        }

        const response = await axios.get('/api/info/', config);
        const username = response.data.username;

        setIsLoggedIn(true);
        setUsername(username);
        setIsLoading(false);

    } catch (error) {
        setIsLoggedIn(false);
        setUsername(null);
        setIsLoading(false);
    }


}

export const UserContext = createContext({
    isLoggedIn: false,
    username: null,
    isLoading: true,
});

export default function UserProvider({children}) {

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        getUserData({setIsLoggedIn, setUsername, setIsLoading});
    }, []);

    return (
        <UserContext.Provider value={{ isLoggedIn, setIsLoggedIn, username, setUsername, isLoading }}>
            {children}
        </UserContext.Provider>
    );
}

// Returns corresponding user context for other React components to easily call
export function useUser() {
    return useContext(UserContext);
}
