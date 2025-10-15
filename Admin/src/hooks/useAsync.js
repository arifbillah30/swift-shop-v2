import axios from "axios";
// import Cookies from 'js-cookie';
import { useContext, useEffect, useState, useRef } from "react";
import { SidebarContext } from "context/SidebarContext";

const useAsync = (asyncFunction) => {
  const [data, setData] = useState([] || {});
  const [error, setError] = useState("");
  // const [errCode, setErrCode] = useState('');
  const [loading, setLoading] = useState(true);
  const isMountedRef = useRef(true);
  
  const {
    isUpdate,
    setIsUpdate,
    currentPage,
    category,
    searchText,
    invoice,
    status,
    zone,
    time,
    sortedField,
    source,
    limitData,
    startDate,
    endDate,
  } = useContext(SidebarContext);

  useEffect(() => {
    isMountedRef.current = true;
    let source = axios.CancelToken.source();
    
    (async () => {
      try {
        setLoading(true);
        const res = await asyncFunction({ cancelToken: source.token });
        if (isMountedRef.current) {
          setData(res);
          setError("");
          setLoading(false);
        }
      } catch (err) {
        if (isMountedRef.current) {
          if (axios.isCancel(err)) {
            // Request was cancelled, don't update state
            return;
          } else {
            setError(err.message);
            setLoading(false);
            setData([]);
          }
        }
      }
    })();

    setIsUpdate(false);

    return () => {
      isMountedRef.current = false;
      source.cancel("Component unmounted - request cancelled");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isUpdate,
    currentPage,
    category,
    searchText,
    invoice,
    status,
    zone,
    time,
    sortedField,
    source,
    limitData,
    startDate,
    endDate,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    data,
    error,
    loading,
  };
};

export default useAsync;
