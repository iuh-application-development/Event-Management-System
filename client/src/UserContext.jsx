/* eslint-disable react/prop-types */
import {createContext, useEffect, useState} from "react";
import axios from 'axios';
import { useFirebaseAuth } from "./FirebaseAuthContext"; // Sửa từ "../FirebaseAuthContext" thành "./FirebaseAuthContext"

export const UserContext = createContext({});

export function UserContextProvider({children}){
  const { user, ready } = useFirebaseAuth();

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