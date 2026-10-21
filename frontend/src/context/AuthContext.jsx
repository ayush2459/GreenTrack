import { createContext, useContext, useState, useEffect } from 'react'
import { auth } from '../utils/api'
const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); const [org, setOrg] = useState(null); const [loading, setLoading] = useState(true)
  useEffect(() => { const token=localStorage.getItem('token'); if(token){auth.me().then(r=>{setUser(r.data.user);setOrg(r.data.organization)}).catch(()=>localStorage.removeItem('token')).finally(()=>setLoading(false))}else setLoading(false) }, [])
  const login=async(u,p)=>{const r=await auth.login(u,p);localStorage.setItem('token',r.data.token);setUser(r.data.user);setOrg(r.data.organization);return r.data}
  const logout=async()=>{try{await auth.logout()}catch{}localStorage.removeItem('token');setUser(null);setOrg(null)}
  return <AuthCtx.Provider value={{user,org,loading,login,logout}}>{children}</AuthCtx.Provider>
}
