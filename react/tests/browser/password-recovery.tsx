import {StrictMode,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createBrowserRouter,redirect,RouterProvider} from 'react-router';
import LoginPage from '../../src/app/Auth/LoginPage';
import ResetPasswordPage from '../../src/app/Auth/ResetPasswordPage';
import {LanguageProvider,useLanguage,languages} from '../../src/app/shared/context';
import {authApi} from '../../src/app/api/auth';
import '../../src/styles/index.css';
function SessionReceipt(){const [name,setName]=useState('');useEffect(()=>{void authApi.me().then(s=>setName(s.user.name));},[]);return <main><h1>{name}</h1></main>;}
const router=createBrowserRouter([
 {path:'/login',element:<LoginPage/>,loader:async()=>await authApi.getSessionOrNull()?redirect('/dashboard'):null},
 {path:'/reset-password/:token',element:<ResetPasswordPage/>},
 {path:'/dashboard',element:<SessionReceipt/>},
]);
function Fixture(){const {setCurrentLanguage}=useLanguage();Object.assign(window,{recoveryFixture:{language(code:string){setCurrentLanguage(languages.find(l=>l.code===code)!);}}});return <RouterProvider router={router}/>;}
createRoot(document.getElementById('root')!).render(<StrictMode><LanguageProvider><Fixture/></LanguageProvider></StrictMode>);
