import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import AppLayout from '../layout/AppLayout'
import { useAuth } from '../../context/AuthContext.jsx'
import { AppBootSkeleton } from '../common/LoadingState.jsx'

const ProtectedRoute = () => {
  const {isAuthenticated,loading}=useAuth();

    if(loading){
        return <AppBootSkeleton />
    }

  return isAuthenticated? (
    <AppLayout> <Outlet/></AppLayout>
  ):(
    <Navigate to="/login" replace/>
  )
}

export default ProtectedRoute
