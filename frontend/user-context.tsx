import {createContext} from 'react';

export class User {
  email: string | null = null;
  active: boolean = false;
}

export const UserContext = createContext({
  user: {'email': null, active: false},
  setUser: () => {}
});
