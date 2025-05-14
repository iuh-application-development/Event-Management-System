/* eslint-disable no-unused-vars */
import { Route, Routes } from "react-router-dom";
import "./App.css";
import { FirebaseAuthProvider } from "./FirebaseAuthContext";
// Xóa các dòng import trùng lặp này
// import { Route, Routes } from 'react-router-dom'
// import './App.css'
import IndexPage from './pages/IndexPage'
import RegisterPage from './pages/RegisterPage'
import Layout from './Layout'
import LoginPage from './pages/LoginPage'
import axios from 'axios'
import { UserContextProvider } from './UserContext'
import UserAccountPage from './pages/UserAccountPage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import AddEvent from './pages/AddEvent'
import EventPage from './pages/EventPage'
import CalendarView from './pages/CalendarView'
import OrderSummary from './pages/OrderSummary'
import PaymentSummary from './pages/PaymentSummary'
import TicketPage from './pages/TicketPage'
import CreatEvent from './pages/CreateEvent'
import AdminPage from './pages/AdminPage';
import Verification from './pages/Verification';

axios.defaults.baseURL = '/api'; // Sử dụng đường dẫn tương đối đến proxy trong nginx
axios.defaults.withCredentials=true;

function App() {
  return (
    <FirebaseAuthProvider>
      <Routes>
        <Route path='/' element={<Layout />}>
          <Route index element = {<IndexPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path='/useraccount' element = {<UserAccountPage />}/>
          <Route path='/createEvent' element = {<CreatEvent/>} />
          <Route path='/event/:id' element= {<EventPage/>} />
          <Route path='/calendar' element={<CalendarView />} />
          <Route path="/verification" element={<Verification />} />          <Route path='/wallet' element={<TicketPage />}/>
          <Route path='/event/:id/ordersummary' element = {<OrderSummary />} />
          <Route path='/event/:id/ordersummary/paymentsummary' element = {<PaymentSummary />} />
        </Route>

        <Route path='/register' element={<RegisterPage />}/>
        <Route path='/login' element={<LoginPage />}/>
        <Route path='/forgotpassword' element = {<ForgotPassword/>} />
        <Route path='/resetpassword' element = {<ResetPassword/>} />
      </Routes>
    </FirebaseAuthProvider>  
  )
}

export default App