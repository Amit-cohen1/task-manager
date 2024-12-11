// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import TodoList from './TodoList';
import Login from './Login';
import Register from './Register';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/login" 
            element={user ? <Navigate to="/todos" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={user ? <Navigate to="/todos" /> : <Register />} 
          />
          <Route 
            path="/todos" 
            element={user ? <TodoList /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/" 
            element={<Navigate to="/todos" />} 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;