import React from 'react';
import { useNavigate } from 'react-router-dom';

const ForgotPassword = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800 text-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-700">
        <h1 className="text-2xl font-bold text-yellow-400 mb-2">Forgot Password</h1>
        <p className="text-slate-400 mb-6">Contact your restaurant Admin or Manager to reset your system password.</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ForgotPassword;
