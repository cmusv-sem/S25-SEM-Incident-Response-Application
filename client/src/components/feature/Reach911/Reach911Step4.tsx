import { Box, CircularProgress, Paper, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'
import ChatBox from '../../Chat/ChatBox'

import request from '../../../utils/request'

import { useDispatch, useSelector } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import { addMessage, loadMessages } from '../../../redux/messageSlice'

import type IChannel from '../../../models/Channel'
import type IIncident from '../../../models/Incident'
import type { AppDispatch, RootState } from '../../../redux/store'

interface Reach911Step4Props {
  isCreatedByFirstResponder?: boolean
}

const Reach911Step4: React.FC<Reach911Step4Props> = ({
  isCreatedByFirstResponder,
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [channelId, setChannelId] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch<AppDispatch>()
  const currentUserId = localStorage.getItem('uid') || ''
  const currentUserRole = localStorage.getItem('role') || ''

  const messages =
    useSelector((state: RootState) => state.messageState.messages)[
      channelId || ''
    ] || []

  const sendMessage = async (content: string, channelId: string) => {
    const message = await request(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content: content, isAlert: false }),
    })
    dispatch(addMessage(message))
  }

  // If responder clicked the + button and user is Fire/Police, return early and display "There is no 911 Caller involved"
  if (
    isCreatedByFirstResponder &&
    (currentUserRole === 'Fire' || currentUserRole === 'Police')
  ) {
    return (
      <Paper elevation={3} sx={{ p: 2, m: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <Typography variant="h6">There is no 911 Caller involved</Typography>
        </Box>
      </Paper>
    )
  }

  useEffect(() => {
    const setupIncidentChat = async () => {
      try {
        const username = localStorage.getItem('username')
        const uid = localStorage.getItem('uid')
        console.log('Debug - User info:', { username, uid })

        if (!username || !uid) {
          throw new Error('User is not logged in')
        }

        // First check if user has active incident with chat
        const incident: IIncident = await request(
          `/api/incidents/${username}/active`,
          {
            method: 'GET',
          },
        )

        console.log('Debug - Active Incident:', incident)

        if (incident.incidentCallGroup && incident.incidentCallGroup !== '') {
          // User already has an active incident with chat
          setChannelId(incident.incidentCallGroup)
        } else {
          // Create a new Channel using request utility
          const channel: IChannel = await request('/api/channels/911', {
            method: 'POST',
            body: JSON.stringify({
              username,
              userId: uid,
            }),
          })

          if (channel?._id) {
            // Update incident with new channel
            await request(`/api/incidents/${incident._id}/chat-group`, {
              method: 'PUT',
              body: JSON.stringify({
                channelId: channel._id,
              }),
            })

            setChannelId(channel._id)
          }
        }
      } catch (error) {
        console.error('Error in setupIncidentChat:', error) // Debug log
        setError('Failed to setup incident chat')
      } finally {
        setLoading(false)
      }
    }

    setupIncidentChat()
  }, [navigate, location])

  // Load messages when channelId changes
  useEffect(() => {
    if (channelId) {
      dispatch(loadMessages(channelId))
    }
  }, [channelId, dispatch])

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 2, m: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      </Paper>
    )
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 2, m: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Paper>
    )
  }

  if (!channelId) {
    return (
      <Paper elevation={3} sx={{ p: 2, m: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <Typography>Initializing chat...</Typography>
        </Box>
      </Paper>
    )
  }

  return (
    <Paper elevation={3} sx={{ p: 2, m: 2 }}>
      <Box
        sx={{
          height: '500px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.paper',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Typography
          variant="h6"
          sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          911 Call
        </Typography>
        <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
          {channelId && (
            <ChatBox
              channelId={channelId}
              messages={messages}
              currentUserId={currentUserId}
              currentUserRole={currentUserRole}
              isLoading={loading}
              onSendMessage={sendMessage}
            />
          )}
        </Box>
      </Box>
    </Paper>
  )
}

export default Reach911Step4
