import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter, RouterProvider, createBrowserRouter } from 'react-router-dom'

// Nếu đang sử dụng createBrowserRouter
const router = createBrowserRouter([
  {
    path: '*',
    element: <App />
  }
], {
  future: {
    v7_relativeSplatPath: true
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Nếu đang sử dụng BrowserRouter */}
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
    
    {/* Hoặc nếu đang dùng RouterProvider */}
    {/* <RouterProvider router={router} /> */}
  </React.StrictMode>
)