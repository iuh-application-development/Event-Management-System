/* eslint-disable react/prop-types */
import {createContext, useEffect, useState} from "react";
import axios from 'axios';

export const UserContext = createContext({});

export function UserContextProvider({children}){
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false); // Thêm state ready

  useEffect(() => {
    if (!user) {
      axios.get('/profile').then(({data}) => {
        setUser(data);
        setReady(true); // Đặt ready = true khi đã tải xong user
      }).catch(err => {
        console.error("Error loading profile:", err);
        setReady(true); // Cũng đặt ready = true khi có lỗi
      });
    }
  }, []);

  return (
    <UserContext.Provider value={{user, setUser, ready}}>
      {children}
    </UserContext.Provider>
  );
}