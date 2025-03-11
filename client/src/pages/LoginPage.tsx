import { AppDispatch } from '@/app/store'
import { Box, Typography } from '@mui/material'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router'
import AlertSnackbar from '../components/common/AlertSnackbar'
import LoginForm, { IProps as ILoginFormProps } from '../components/LoginForm'
import request, { IRequestError } from '../utils/request'

// LoginPage component: Handles user authentication
export default function LoginPage() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [openSnackbar, setOpenSnackbar] = useState(false)
  const history = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  dispatch({ type: 'socket/close' })

  // Function to handle login process
  // @param username - The username entered by the user
  // @param password - The password entered by the user
  const login: ILoginFormProps['login'] = async ({ username, password }) => {
    try {
      const { token, _id, role } = (await request('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          username,
          password,
        }),
      })) as {
        token: string
        _id: string
        role: string
      }

      // Store user data in localStorage
      localStorage.setItem('token', token)
      localStorage.setItem('uid', _id)
      localStorage.setItem('username', username)
      localStorage.setItem('role', role)

      dispatch({ type: 'socket/connect' })

      history('/')
    } catch (e) {
      const error = e as IRequestError
      if (error.status >= 400 && error.status < 500) {
        setErrorMessage(`Error: ${error.message}`)
      } else {
        setErrorMessage('Server error occurred. Please try again later.')
      }
      setOpenSnackbar(true)
    }
  }

  const handleCloseSnackbar = () => {
    setOpenSnackbar(false)
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      alignItems="center"
      padding="16px"
      height="100%"
    >
      <Box mt={4} mb={2}>
        <Typography
          paddingX="32px"
          color="primary"
          align="center"
          variant="h3"
          paragraph
        >
          Incident Response
        </Typography>
      </Box>
      <Box width="100%" maxWidth="500px">
        <LoginForm login={login} />
      </Box>
      <AlertSnackbar
        open={openSnackbar}
        message={errorMessage || ''}
        onClose={handleCloseSnackbar}
        severity="error"
        vertical="bottom"
        horizontal="center"
      />
    </Box>
  )
}
