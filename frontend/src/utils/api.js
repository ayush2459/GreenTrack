import axios from 'axios'
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
const api = axios.create({ baseURL: BASE })
api.interceptors.request.use(cfg => { const token=localStorage.getItem('token'); if(token) cfg.headers.Authorization=`Token ${token}`; return cfg })
api.interceptors.response.use(r=>r,err=>{if(err.response?.status===401){localStorage.removeItem('token');window.location.href='/login'}return Promise.reject(err)})
export const auth={login:(u,p)=>api.post('/auth/login/',{username:u,password:p}),me:()=>api.get('/auth/me/'),logout:()=>api.post('/auth/logout/')}
export const records={list:params=>api.get('/emission-records/',{params}),stats:()=>api.get('/emission-records/stats/'),review:(id,action,note)=>api.post(`/emission-records/${id}/review/`,{action,note}),bulkReview:(ids,action,note)=>api.post('/emission-records/bulk_review/',{ids,action,note})}
export const sources={list:()=>api.get('/data-sources/'),create:data=>api.post('/data-sources/',data)}
export const runs={list:()=>api.get('/ingestion-runs/')}
export const ingest={upload:fd=>api.post('/ingest/',fd,{headers:{'Content-Type':'multipart/form-data'}})}
export const auditLog={list:()=>api.get('/audit-events/')}
export const ai={recommendations:provider=>api.post('/ai/recommendations/',{provider:provider||'auto'})}
export default api
