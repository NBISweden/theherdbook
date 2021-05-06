import * as React from "react";

import { useUserContext } from "@app/user_context";

/** Component to write some info about the logged in user */
export function UserInfo() {
  const { user } = useUserContext();
  return (
    <>
      Email: {user ? user.email : "anonymous"}
      {user ? <> ({user.validated ? "validated" : "not validated"})</> : ""}
    </>
  );
}
