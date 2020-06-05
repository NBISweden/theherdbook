import {default as fetch_mock, enableFetchMocks} from 'jest-fetch-mock'
enableFetchMocks()

import * as React from 'react'
import { render, fireEvent, waitFor, screen, act } from '@testing-library/react'

import {WithUserContext} from './user_context'
import {UserInfo} from './user_info'
import {Login} from './login'


test('login information set at mount (logged in)', async () => {
  fetch_mock.mockOnce(JSON.stringify({email: 'testuser@nbis.se', validated: false}))

  render(<WithUserContext><UserInfo/></WithUserContext>)

  await waitFor(() => screen.getByText(/testuser@nbis.se/))

  expect(fetch).toHaveBeenCalledTimes(1)

  {
    const [url, params] = fetch_mock.mock.calls[0]
    expect(url).toBe('/api/user')
    expect(params?.method).toBe('GET')
  }

  expect(screen.queryAllByText(/testuser@nbis.se/)).toHaveLength(1)
})


test('login information set at mount (not logged in)', async () => {
  fetch_mock.mockOnce(JSON.stringify(null))

  render(<WithUserContext><UserInfo/></WithUserContext>)

  await waitFor(() => screen.getByText(/anonymous/))

  expect(fetch).toHaveBeenCalledTimes(1)
  {
    const [url, params] = fetch_mock.mock.calls[0]
    expect(url).toBe('/api/user')
    expect(params?.method).toBe('GET')
  }

  expect(screen.queryAllByText(/anonymous/)).toHaveLength(1)
})


test('can be logged in', async () => {
  fetch_mock.mockOnce(JSON.stringify(null))

  render(<WithUserContext><Login/><UserInfo/></WithUserContext>)

  fetch_mock.mockOnce(JSON.stringify({email: 'testuser@nbis.se', validated: false}))

  fireEvent.change(screen.getByLabelText(/E-postadress/), {target: {value: 'testuser@nbis.se'}})

  fireEvent.change(screen.getByLabelText(/Lösenord/), {target: {value: 'hunter3'}})

  fireEvent.click(screen.getByLabelText(/Logga in/))

  await waitFor(() => screen.getByText(/testuser@nbis.se/))

  expect(fetch).toHaveBeenCalledTimes(2)

  {
    const [url, params] = fetch_mock.mock.calls[0]
    expect(url).toBe('/api/user')
    expect(params?.method).toBe('GET')
  }

  {
    const [url, params] = fetch_mock.mock.calls[1]
    expect(url).toBe('/api/login')
    expect(params?.method).toBe('POST')
    const body = JSON.parse(params && typeof params.body == 'string' ? params.body : '')
    expect(body.username).toBe('testuser@nbis.se')
    expect(body.password).toBe('hunter3')
  }

  expect(screen.queryAllByText(/testuser@nbis.se/)).toHaveLength(1)
})

test('can be logged out', async () => {
  fetch_mock.mockOnce(JSON.stringify({email: 'testuser@nbis.se', validated: false}))

  render(<WithUserContext><Login/><UserInfo/></WithUserContext>)

  await waitFor(() => screen.getByText(/testuser@nbis.se/))
  expect(fetch).toHaveBeenCalledTimes(1)
  {
    const [url, params] = fetch_mock.mock.calls[0]
    expect(url).toBe('/api/user')
    expect(params?.method).toBe('GET')
  }

  fetch_mock.mockOnce(JSON.stringify(null))
  fireEvent.click(screen.getByText('Logout'))

  await waitFor(() => screen.getByText(/anonymous/))
  expect(fetch).toHaveBeenCalledTimes(2)
  {
    const [url, params] = fetch_mock.mock.calls[1]
    expect(url).toBe('/api/logout')
    expect(params?.method).toBe('GET')
  }
  expect(screen.queryAllByText(/testuser@nbis.se/)).toHaveLength(0)
  expect(screen.queryAllByText(/anonymous/)).toHaveLength(1)
})
