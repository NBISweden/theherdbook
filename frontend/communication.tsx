import React from 'react'
import { Herd } from '~data_context_global';

declare const process: {env: {NODE_ENV: string}}

const credentials_policy = 'same-origin';

/**
 * Creates a GET request to the given `url`, and returns the reply as json.
 *
 * @param url The target URL for the GET request
 */
export async function get(url: string) {
  const resp = await fetch(url, {
    method: 'GET',
    credentials: credentials_policy,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });
  return await resp.json();
}

/**
 * Creates a POST request to the given `url` containing `content`, and returns
 * the reply as json.
 *
 * @param url The target URL for the POST request
 * @param content The content to be sent with the request
 */
export async function post(url: string, content: any) {
  const resp = await fetch(url, {
    body: JSON.stringify(content),
    method: 'POST',
    credentials: credentials_policy,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  }
  );
  return await resp.json();
}

/**
 * Creates an UPDATE request to the given `url` containing `content`, and
 * returnsthe reply as json.
 *
 * @param url The target URL for the POST request
 * @param content The content to be sent with the request
 */
export async function update(url: string, content: any) {
  const resp = await fetch(url, {
    body: JSON.stringify(content),
    method: 'UPDATE',
    credentials: credentials_policy,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  }
  );
  return await resp.json();
}


export async function updateHerd(herd: Herd) {
  // replace empty strings with null values
  Object.keys(herd).forEach((k: string) => {herd[k] = herd[k] == '' ? null : herd[k]})
  return await update('/api/manage/herd', herd).then(
    data => {
      return data.status;
    },
    error => {
      console.error(error);
      return "error"
    }
  )
}
