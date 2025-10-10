import Cookies from 'js-cookie';
import { useContext, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useHistory, useLocation } from 'react-router-dom';
import { AdminContext } from 'context/AdminContext';
import AdminServices from 'services/AdminServices';
import { notifyError, notifySuccess } from 'utils/toast';

const useLoginSubmit = () => {
  const [loading, setLoading] = useState(false);
  const { dispatch } = useContext(AdminContext);
  const history = useHistory();
  const location = useLocation();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = ({ name, email, verifyEmail, password, role }) => {
    console.log('Login form submitted:', { email, password, location: location.pathname });
    setLoading(true);
    const cookieTimeOut = 7; // 7 days

    if (location.pathname === '/login') {
      console.log('Making login API call...');
      AdminServices.loginAdmin({ email, password })
        .then((res) => {
          console.log('Login API response:', res);
          if (res && res.success) {
            setLoading(false);
            notifySuccess('Login Success!');
            // Handle new API response format - data is nested under res.data
            const adminData = res.data;
            dispatch({ type: 'USER_LOGIN', payload: adminData });
            Cookies.set('adminInfo', JSON.stringify(adminData), {
              expires: cookieTimeOut,
            });
            console.log('Redirecting to dashboard...');
            history.replace('/dashboard');
          }
        })
        .catch((err) => {
          console.error('Login API error:', err);
          notifyError(err ? err.response.data.message : err.message);
          setLoading(false);
        });
    }

    if (location.pathname === '/signup') {
      AdminServices.registerAdmin({ name, email, password, role })
        .then((res) => {
          if (res && res.success) {
            setLoading(false);
            notifySuccess('Register Success!');
            // Handle new API response format - data is nested under res.data
            const adminData = res.data;
            dispatch({ type: 'USER_LOGIN', payload: adminData });
            Cookies.set('adminInfo', JSON.stringify(adminData), {
              expires: cookieTimeOut,
            });
            history.replace('/dashboard');
          }
        })
        .catch((err) => {
          notifyError(err ? err.response.data.message : err.message);
          setLoading(false);
        });
    }

    if (location.pathname === '/forgot-password') {
      AdminServices.forgetPassword({ verifyEmail })
        .then((res) => {
          setLoading(false);
          notifySuccess(res.message);
        })
        .catch((err) => {
          setLoading(false);
          notifyError(err ? err.response.data.message : err.message);
        });
    }
  };
  return {
    onSubmit,
    register,
    handleSubmit,
    errors,
    loading,
  };
};

export default useLoginSubmit;
