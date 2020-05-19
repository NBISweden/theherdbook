import {createContext} from 'react';

export interface User {
  email: string | null;
  active: boolean;
}

export const UserContext = createContext({
  user: {},
  setUser: () => {}
});
