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
    {/* Chỉ sử dụng một phương pháp định tuyến - ở đây chúng ta dùng RouterProvider */}
    <RouterProvider router={router} />
    
    {/* 
    Nếu muốn sử dụng BrowserRouter thay thế, hãy comment dòng trên và bỏ comment đoạn dưới:
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <App />
    </BrowserRouter>
    */}
  </React.StrictMode>
)