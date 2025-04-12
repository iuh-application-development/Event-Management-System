import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useFirebaseAuth } from "../FirebaseAuthContext";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [redirect, setRedirect] = useState(false);
  const [error, setError] = useState(null);
  
  const { registerWithEmail, loading } = useFirebaseAuth();

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!name || !email || !password) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }
    
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự");
      return;
    }
    
    try {
      await registerWithEmail(name, email, password);
      alert("Đăng ký thành công! Vui lòng đăng nhập.");
      setRedirect(true);
    } catch (error) {
      console.error("Lỗi đăng ký:", error);
      
      if (error.code === "auth/email-already-in-use") {
        setError("Email đã được sử dụng. Vui lòng chọn email khác.");
      } else if (error.code === "auth/invalid-email") {
        setError("Email không hợp lệ.");
      } else if (error.code === "auth/weak-password") {
        setError("Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn.");
      } else {
        setError("Đăng ký thất bại. Vui lòng thử lại sau.");
      }
    }
  };

  if (redirect) {
    return <Navigate to={"/login"} />;
  }

  return (
    <div className="mt-4 grow flex items-center justify-around">
      <div className="mb-64">
        <h1 className="text-4xl text-center mb-4">Đăng ký</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form className="max-w-md mx-auto" onSubmit={handleRegisterSubmit}>
          <input
            type="text"
            placeholder="Họ tên"
            value={name}
            onChange={(ev) => setName(ev.target.value)}
            disabled={loading}
            className="w-full border my-1 py-2 px-3 rounded-2xl"
          />
          <input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            disabled={loading}
            className="w-full border my-1 py-2 px-3 rounded-2xl"
          />
          <input
            type="password"
            placeholder="Mật khẩu"
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            disabled={loading}
            className="w-full border my-1 py-2 px-3 rounded-2xl"
          />
          
          <button 
            type="submit"
            disabled={loading}
            className="bg-primary w-full p-2 text-white rounded-2xl">
            {loading ? 'Đang xử lý...' : 'Đăng ký'}
          </button>
        </form>
        
        <div className="text-center py-2 text-gray-500">
          Đã có tài khoản? {" "}
          <Link className="underline text-black" to={"/login"}>
            Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}