import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api/chat-auth";

export default function ChatAuth() {

  const navigate = useNavigate();

  const [isLogin,setIsLogin] = useState(true);
  const [loading,setLoading] = useState(false);

  const [popup,setPopup] = useState({
    show:false,
    text:"",
    type:"success"
  });

  const [form,setForm] = useState({
    name:"",
    email:"",
    password:""
  });

  const handleChange = (e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };

  const showPopup=(text,type="success")=>{

    setPopup({
      show:true,
      text,
      type
    });

    setTimeout(()=>{
      setPopup({show:false,text:""});
    },2000);

  };

  const handleSubmit = async(e)=>{

    e.preventDefault();

    try{

      setLoading(true);

      if(isLogin){

        const res = await axios.post(`${API_URL}/login`,{
          email:form.email,
          password:form.password
        });

        localStorage.setItem("chatToken",res.data.token);
        localStorage.setItem("chatUser",JSON.stringify(res.data.user));

        showPopup("Login Successful");

        setTimeout(()=>{
          navigate("/chat");
        },1200);

      }
      else{

        await axios.post(`${API_URL}/register`,form);

        showPopup("Registration Successful");

        setIsLogin(true);

      }

    }
    catch(err){

      showPopup(
        err.response?.data?.message || "Something went wrong",
        "error"
      );

    }

    setLoading(false);

  };

  return(

    <div style={styles.page}>

      {popup.show && (

        <div style={styles.popupOverlay}>

          <div
            style={{
              ...styles.popup,
              background:
                popup.type==="error"
                ? "#ef4444"
                : "#16a34a"
            }}
          >
            {popup.text}
          </div>

        </div>

      )}

      <div style={styles.container}>

        <div style={styles.header}>

          <div style={styles.logo}>
            💬
          </div>

          <h2 style={styles.title}>
            {isLogin ? "Chat Login" : "Create Account"}
          </h2>

          <p style={styles.subtitle}>
            Real-time messaging platform
          </p>

        </div>

        <form style={styles.form} onSubmit={handleSubmit}>

          {!isLogin && (

            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              style={styles.input}
              required
            />

          )}

          <input
            name="email"
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            style={styles.input}
            required
          />

          <button style={styles.button} disabled={loading}>

            {loading
              ? "Please wait..."
              : isLogin
              ? "Login"
              : "Register"}

          </button>

        </form>

        <p style={styles.switchText}>

          {isLogin
            ? "Don't have an account?"
            : "Already have an account?"}

          <span
            style={styles.switchBtn}
            onClick={()=>setIsLogin(!isLogin)}
          >
            {isLogin ? " Register" : " Login"}
          </span>

        </p>

      </div>

    </div>

  );

}

const styles={

  page:{
    minHeight:"100vh",
    width:"100%",
    background:"#ffffff",
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    padding:"0"
  },

  container:{
    width:"100%",
    maxWidth:"420px",
    padding:"40px 28px",
    background:"#ffffff",
    borderRadius:"0",
    boxShadow:"0 10px 40px rgba(0,0,0,0.08)",
    border:"1px solid #f1f5f9"
  },

  header:{
    textAlign:"center",
    marginBottom:"28px"
  },

  logo:{
    fontSize:"36px",
    marginBottom:"10px"
  },

  title:{
    fontWeight:"700",
    marginBottom:"6px"
  },

  subtitle:{
    color:"#64748b",
    fontSize:"14px"
  },

  form:{
    display:"flex",
    flexDirection:"column",
    gap:"14px"
  },

  input:{
    padding:"12px",
    borderRadius:"8px",
    border:"1px solid #e2e8f0",
    fontSize:"14px",
    outline:"none",
    transition:"all .2s"
  },

  button:{
    marginTop:"5px",
    padding:"13px",
    borderRadius:"8px",
    border:"none",
    background:"#2563eb",
    color:"#fff",
    fontWeight:"600",
    fontSize:"15px",
    cursor:"pointer",
    transition:"all .2s"
  },

  switchText:{
    marginTop:"18px",
    textAlign:"center",
    fontSize:"14px"
  },

  switchBtn:{
    color:"#2563eb",
    fontWeight:"600",
    cursor:"pointer",
    marginLeft:"5px"
  },

  popupOverlay:{
    position:"fixed",
    top:0,
    left:0,
    right:0,
    bottom:0,
    display:"flex",
    justifyContent:"center",
    alignItems:"center",
    background:"rgba(0,0,0,0.25)",
    zIndex:1000
  },

  popup:{
    padding:"14px 26px",
    borderRadius:"10px",
    color:"#fff",
    fontWeight:"600",
    fontSize:"15px",
    boxShadow:"0 10px 30px rgba(0,0,0,0.25)"
  }

};