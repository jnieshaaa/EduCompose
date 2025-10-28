import React, { createContext, useContext, useState, ReactNode } from "react";

interface LoaderContextType {
  loading: boolean;
  setLoading: (val: boolean) => void;
}

const LoaderContext = createContext<LoaderContextType>({
  loading: false,
  setLoading: () => {},
});

export const useLoader = () => useContext(LoaderContext);

interface LoaderProviderProps {
  children: ReactNode;
}

export const LoaderProvider: React.FC<LoaderProviderProps> = ({ children }) => {
  const [loading, setLoading] = useState(false);

  return (
    <LoaderContext.Provider value={{ loading, setLoading }}>
      {children}
    </LoaderContext.Provider>
  );
};
