import GenericItemizeContainer from '@/components/GenericItemizeContainer'
import { Add, NavigateNext as Arrow, Settings, Close as X } from '@mui/icons-material'
import {
  Box,
  FormControl,
  IconButton,
  Menu,
  MenuItem,
  Select,
  Tooltip,
  Typography
} from '@mui/material'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { IncidentType } from '../models/Incident'
import { resetIncident } from '../redux/incidentSlice'
import request from '../utils/request'

interface IncidentData {
  incidentId: string
  openingDate: string
  type: string
  priority: string
  incidentState: string
  owner: string
  commander: string
}

function IncidentsPage() {
  const [role, setRole] = useState(localStorage.getItem('role'))
  const [data, setData] = useState<IncidentData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterAnchorEl, setFilterAnchorEl] = useState<null | HTMLElement>(null)
  const [selectedType, setSelectedType] = useState('All')
  const [userId] = useState(localStorage.getItem('username') || '')
  const [filteredData, setFilteredData] = useState<IncidentData[]>([])
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(resetIncident())
  }, [dispatch])

  // Retrieve role from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem('role')
    if (storedRole) setRole(storedRole)
  }, [])

  // Fetch incidents from the server
  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const data = await request('/api/incidents')
        setData(data)
      } catch (err: any) {
        if (
          err &&
          err.message &&
          err.message.includes('Unexpected end of JSON input') // NEED TO REFACTOR AND HANDLE IN BACKEND
        ) {
          setData([])
        } else {
          setError(err.message)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [role])

  // Filter incidents based on selected type
  useEffect(() => {
    if (selectedType === 'All') {
      setFilteredData(data)
    } else {
      const mappedType = {
        Fire: IncidentType.Fire,
        Medical: IncidentType.Medical,
        Police: IncidentType.Police,
        Unset: IncidentType.Unset,
      }[selectedType]
      setFilteredData(data.filter((incident) => incident.type === mappedType))
    }
  }, [selectedType, data])

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>

  // Sort incidents by opening date function
  const sortByOpeningDate = (incidents: IncidentData[]) =>
    incidents.sort(
      (a, b) =>
        new Date(a.openingDate).getTime() - new Date(b.openingDate).getTime(),
    )

  // Group incidents for display based on role
  let incidentGroups: { [key: string]: IncidentData[] } = {}
  if (role === 'Fire' || role === 'Police') {
    const filteredByAssigned = filteredData.filter(
      (incident) => incident.incidentState === 'Assigned',
    )
    const priorityOrder: Record<string, number> = {
      E: 1,
      One: 2,
      Two: 3,
      Three: 4,
    }

    const sortByPriorityOnly = (incidents: IncidentData[]) =>
      incidents.sort((a, b) => {
        const priorityA = priorityOrder[a.priority] || 99
        const priorityB = priorityOrder[b.priority] || 99
        return priorityA - priorityB
      })

    incidentGroups = {
      'My Incident': filteredByAssigned.filter(
        (incident) => incident.commander === userId,
      ),
      'Other Open Incidents': sortByPriorityOnly(
        filteredByAssigned.filter((incident) => incident.commander !== userId),
      ),
      'Closed Incidents': sortByOpeningDate(
        filteredData.filter((incident) => incident.incidentState === 'Closed'),
      ),
    }
  } else {
    incidentGroups = {
      Waiting: sortByOpeningDate(
        filteredData.filter((incident) => incident.incidentState === 'Waiting'),
      ),
      Triage: sortByOpeningDate(
        filteredData.filter(
          (incident) =>
            incident.incidentState === 'Triage' && incident.owner === userId,
        ),
      ),
      Assigned: sortByOpeningDate(
        filteredData.filter(
          (incident) =>
            incident.incidentState === 'Assigned' && incident.owner === userId,
        ),
      ),
      Closed: sortByOpeningDate(
        filteredData.filter(
          (incident) =>
            incident.incidentState === 'Closed' && incident.owner === userId,
        ),
      ),
    }
  }

  // Create new incident when the + button is clicked and redirect to the first page
  const handleAddIncident = async () => {
    try {
      const username = localStorage.getItem('username')
      if (!username) throw new Error('Username not found in local storage.')

      let incidentCount = 1
      try {
        const userIncidents = await request(`/api/incidents?caller=${username}`)
        incidentCount = Array.isArray(userIncidents)
          ? userIncidents.length + 1
          : 1
      } catch (error: any) {
        if (
          error &&
          error.message &&
          error.message.includes('Unexpected end of JSON input') // NEED TO HANDLE IN BACKEND INSTEAD
        ) {
          incidentCount = 1
        } else {
          throw error
        }
      }
      const incidentId = `I${username}${incidentCount}`
      const newIncident = {
        incidentId,
        caller: username,
        openingDate: new Date().toISOString(),
        incidentState: 'Assigned',
        owner: username,
        commander: username,
      }

      await request('/api/incidents/new', {
        method: 'POST',
        body: JSON.stringify(newIncident),
        headers: { 'Content-Type': 'application/json' },
      })

      navigate('/reach911', {
        state: {
          incidentId,
          isCreatedByFirstResponder: true,
        },
      })
    } catch (error) {
      console.error('Error creating new incident:', error)
    }
  }

   const handleAddSARIncident = async () => {
    try {
      const username = localStorage.getItem('username')
      if (!username) throw new Error('Username not found in local storage.')

      // Count existing SAR incidents for this user to determine the sequence number
      let sarIncidentCount = 1
      try {
        const userIncidents = await request(`/api/incidents?caller=${username}`)
        if (Array.isArray(userIncidents)) {
          // Filter to count only SAR incidents
          const sarIncidents = userIncidents.filter(
            (incident) => incident.type === 'S'
          )
          sarIncidentCount = sarIncidents.length + 1
        }
      } catch (error: any) {
        if (
          error &&
          error.message &&
          error.message.includes('Unexpected end of JSON input')
        ) {
          sarIncidentCount = 1
        } else {
          throw error
        }
      }

      // Create unique SAR incident ID (e.g. "SDena12")
      const incidentId = `S${username}${sarIncidentCount}`
      
      // Create the new SAR incident
      const newSARIncident = {
        incidentId,
        caller: username,
        openingDate: new Date().toISOString(),
        incidentState: 'Assigned',
        owner: username,
        commander: username,
        type: 'S'
      }

      await request('/api/incidents/new', {
        method: 'POST',
        body: JSON.stringify(newSARIncident),
        headers: { 'Content-Type': 'application/json' },
      })

    } catch (error) {
      console.error('Error creating new SAR incident:', error)
    }
  }

  // Check if the user has an active incident (not closed)
  const hasActiveResponderIncident = data.some(
    (incident) =>
      (incident.owner === userId || incident.commander === userId) &&
      incident.incidentState !== 'Closed',
  )

  // Navigate to incident description with auto-populate on
  const handleIncidentClick = (incident: IncidentData) => {
    let readOnly = false
    if (
      incident.incidentState === 'Closed' ||
      (incident.commander !== userId && incident.owner !== userId)
    ) {
      readOnly = true
    }
    const autoPopulateData = true
    navigate('/reach911', {
      state: {
        incidentId: incident.incidentId,
        readOnly,
        autoPopulateData,
      },
    })
  }

  // Render the page
  return (
    <Box sx={{ padding: 2 }}>
      <Typography variant="h4" gutterBottom>
        Incidents Dashboard
      </Typography>
      {Object.entries(incidentGroups).map(([header, incidents]) => (
        <GenericItemizeContainer<IncidentData>
          key={header}
          items={incidents}
          getKey={(incident) => incident.incidentId}
          title={header}
          showHeader={false}
          emptyMessage="No incidents available"
          columns={[
            {
              key: 'incidentId',
              align: 'center',
              label: 'Incident ID',
              render: (incident) => incident.incidentId,
            },
            {
              key: 'openingDate',
              align: 'center',
              label: 'Opening Date',
              render: (incident) =>
                new Date(incident.openingDate).toLocaleString('en-US', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                }),
            },
            {
              key: 'type',
              align: 'center',
              label: 'Type',
              render: (incident) => incident.type,
            },
            {
              key: 'priority',
              align: 'center',
              label: 'Priority',
              render: (incident) => {
                const priorityMap: Record<string, string> = {
                  One: '1',
                  Two: '2',
                  Three: '3',
                }
                return priorityMap[incident.priority] || incident.priority // Default to original value if not found
              },
            },
            {
              key: 'incidentId',
              align: 'center',
              label: 'Action',
              render: (incident) => (
                <IconButton
                  edge="end"
                  size="large"
                  onClick={() => handleIncidentClick(incident)}
                >
                  <Arrow />
                </IconButton>
              ),
            },
          ]}
        />
      ))}
      {role === 'Fire' || role === 'Police' ? (
        <>
          <IconButton
            sx={{
              position: 'fixed',
              bottom: 16,
              left: 18,
              width: 56,
              height: 56,
            }}
            onClick={(event) => setFilterAnchorEl(event.currentTarget)}
          >
            <Settings />
            <Typography
              variant="caption"
              sx={{ marginLeft: 1, fontSize: 'medium' }}
            >
              Type
            </Typography>
          </IconButton>
          <Menu
            anchorEl={filterAnchorEl}
            open={Boolean(filterAnchorEl)}
            onClose={() => setFilterAnchorEl(null)}
          >
            <MenuItem>
              <FormControl fullWidth>
                <Select
                  value={selectedType}
                  onChange={(event) => {
                    setSelectedType(event.target.value)
                    setFilterAnchorEl(null)
                  }}
                >
                  <MenuItem value="All">All</MenuItem>
                  <MenuItem value="Fire">Fire</MenuItem>
                  <MenuItem value="Medical">Medical</MenuItem>
                  <MenuItem value="Police">Police</MenuItem>
                  <MenuItem value="SAR">SAR</MenuItem>
                </Select>
              </FormControl>
            </MenuItem>
          </Menu>
          {/* {!hasActiveResponderIncident &&  */}
        {
          (
            <>
              <Tooltip title="Create new SAR incident">
                <IconButton
                  sx={{
                    position: 'fixed',
                    bottom: 16,
                    left: 250,
                    width: 56,
                    height: 56,
                  }}
                  onClick={handleAddSARIncident}
                >
                  <X fontSize="large" />
                </IconButton>
              </Tooltip>
            
            <IconButton
              sx={{
                position: 'fixed',
                bottom: 16,
                right: 16,
                width: 56,
                height: 56,
              }}
              onClick={handleAddIncident}
            >
              <Add fontSize="large" />
            </IconButton>
            </>
          )
          }
        </>
      ) : null}
    </Box>
  )
}

export default IncidentsPage
