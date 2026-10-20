import {StrictMode, useEffect, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createBrowserRouter, redirect, RouterProvider} from 'react-router';
import LoginPage from '../../src/app/Auth/LoginPage';
import {LanguageProvider, useLanguage, languages} from '../../src/app/shared/context';
import {authApi} from '../../src/app/api/auth';
import '../../src/styles/index.css';
function SessionReceipt(){const [receipt,setReceipt]=useState('');useEffect(()=>{void authApi.me().then(s=>setReceipt(`${s.user.name} / ${s.company.name} / ${s.user.role}`));},[]);return <main><h1>{receipt}</h1></main>;}
const router=createBrowserRouter([
 {path:'/login',element:<LoginPage/>,loader:async()=>await authApi.getSessionOrNull()?redirect('/dashboard'):null},
 {path:'/dashboard',element:<SessionReceipt/>},
 {path:'/oauth/authorize',element:<SessionReceipt/>},
 {path:'/away',element:<h1>Unrelated page</h1>},
]);
function Fixture(){const {setCurrentLanguage}=useLanguage();Object.assign(window,{loginFixture:{language(code:string){const selected=languages.find(l=>l.code===code);if(!selected)throw new Error('Unsupported fixture language');setCurrentLanguage(selected);},enter(returnTo:string){return router.navigate('/login',{state:{returnTo}});},away(){return router.navigate('/away');}}});return <RouterProvider router={router}/>;}
createRoot(document.getElementById('root')!).render(<StrictMode><LanguageProvider><Fixture/></LanguageProvider></StrictMode>);
