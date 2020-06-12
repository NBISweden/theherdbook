import React from 'react'

declare const process: {env: {NODE_ENV: string}}

export const backend_url =
  process.env.NODE_ENV === 'development'
  ? 'http://localhost:4200'
  : '';

const credentials_policy =
  process.env.NODE_ENV === 'development'
  ? 'include'
  : 'same-origin';

/**
 * Creates a GET request to the given `url`, and returns the reply as json.
 *
 * @param url The target URL for the GET request
 */
export async function get(url: string) {
  const resp = await fetch(backend_url + url, {
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
  const resp = await fetch(backend_url + url, {
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
  const resp = await fetch(backend_url + url, {
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
