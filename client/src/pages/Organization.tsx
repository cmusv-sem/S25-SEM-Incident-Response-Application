/**
 * Organization.tsx - Example with both MUI & Bootstrap integrated
 */

import 'bootstrap/dist/css/bootstrap.min.css'
import React, { useEffect, useState } from 'react'

import { Add, Delete } from '@mui/icons-material'
import {
  Box,
  Card,
  CardContent,
  IconButton,
  List,
  ListItem,
  ListItemText,
  TextField,
  Typography,
  useMediaQuery,
} from '@mui/material'
import {
  DragDropContext,
  Draggable,
  Droppable,
  DropResult,
} from 'react-beautiful-dnd'
import { useNavigate } from 'react-router-dom'
import CityContainer from '../components/Organization/CityContainer'
import request from '../utils/request'

// Interfaces representing the backend data
interface Car {
  assignedCity: string
  _id: string
  name: string
}
interface Truck {
  assignedCity: string
  _id: string
  name: string
}
interface City {
  _id: string
  name: string
}
interface Personnel {
  assignedCity: string
  _id: string
  name: string
}

const Organization: React.FC = () => {
  const navigate = useNavigate()

  // Arrays for each data type
  const [cars, setCars] = useState<Car[]>([])
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [personnel, setPersonnel] = useState<Personnel[]>([])

  // Inputs for creating new items
  const [newCar, setNewCar] = useState('')
  const [newTruck, setNewTruck] = useState('')
  const [newCity, setNewCity] = useState('')

  // Used to refresh CityContainer after changes
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // For responsive layout
  const isMobile = useMediaQuery('(max-width:600px)')

  // -----------------------------
  //   FETCH DATA FROM BACKEND
  // -----------------------------
  const fetchAllData = async () => {
    try {
      const [carsData, trucksData, citiesData, personnelData] =
        await Promise.all([
          request<Car[]>('/api/cars'),
          request<Truck[]>('/api/trucks'),
          request<City[]>('/api/cities'),
          request<Personnel[]>('/api/personnel'),
        ])
      setCars(carsData)
      setTrucks(trucksData)
      setCities(citiesData)
      setPersonnel(personnelData)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }

  useEffect(() => {
    fetchAllData()
  }, [])

  // Sort for display purpose
  const sortedCars = [...cars].sort((a, b) => a.name.localeCompare(b.name))
  const sortedTrucks = [...trucks].sort((a, b) => a.name.localeCompare(b.name))
  const sortedCities = [...cities].sort((a, b) => a.name.localeCompare(b.name))
  const sortedPersonnel = [...personnel].sort((a, b) =>
    a.name.localeCompare(b.name),
  )

  // -----------------------------
  //        CREATE & DELETE
  // -----------------------------

  // Create a new Car (with uniqueness check)
  const addCar = async () => {
    const candidate = newCar.trim()
    if (!candidate) return

    // Check duplicates
    const alreadyExists = cars.some(
      (c) => c.name.toLowerCase() === candidate.toLowerCase(),
    )
    if (alreadyExists) {
      alert(`A car named "${candidate}" already exists!`)
      return
    }

    try {
      await request('/api/cars', {
        method: 'POST',
        body: JSON.stringify({ name: candidate }),
      })
      setNewCar('')
      await fetchAllData()
    } catch (err) {
      console.error('Error creating car:', err)
    }
  }

  const removeCar = async (carId: string) => {
    try {
      await request(`/api/cars/${carId}`, { method: 'DELETE' })
      setCars((prev) => prev.filter((c) => c._id !== carId))
    } catch (err) {
      console.error('Error deleting car:', err)
    }
  }

  // Create a new Truck (with uniqueness check)
  const addTruck = async () => {
    const candidate = newTruck.trim()
    if (!candidate) return

    // Check duplicates
    const alreadyExists = trucks.some(
      (t) => t.name.toLowerCase() === candidate.toLowerCase(),
    )
    if (alreadyExists) {
      alert(`A truck named "${candidate}" already exists!`)
      return
    }

    try {
      await request('/api/trucks', {
        method: 'POST',
        body: JSON.stringify({ name: candidate }),
      })
      setNewTruck('')
      await fetchAllData()
    } catch (err) {
      console.error('Error creating truck:', err)
    }
  }

  const removeTruck = async (truckId: string) => {
    try {
      await request(`/api/trucks/${truckId}`, { method: 'DELETE' })
      setTrucks((prev) => prev.filter((t) => t._id !== truckId))
    } catch (err) {
      console.error('Error deleting truck:', err)
    }
  }

  // Create a new City (with uniqueness check)
  const addCity = async () => {
    const candidate = newCity.trim()
    if (!candidate) return

    // Check duplicates
    const alreadyExists = cities.some(
      (ci) => ci.name.toLowerCase() === candidate.toLowerCase(),
    )
    if (alreadyExists) {
      alert(`A city named "${candidate}" already exists!`)
      return
    }

    try {
      await request('/api/cities', {
        method: 'POST',
        body: JSON.stringify({ name: candidate }),
      })
      setNewCity('')
      await fetchAllData()
    } catch (err) {
      console.error('Error creating city:', err)
    }
  }

  // -----------------------------
  //     REMOVE CITY LOGIC
  // -----------------------------
  const removeCity = async (cityId: string) => {
    const confirmed = window.confirm(
      'Are you sure you want to delete this city? All associated cars/trucks/personnel will be unassigned.',
    )
    if (!confirmed) return

    try {
      // The backend will automatically unassign any associated items
      await request(`/api/cities/${cityId}`, { method: 'DELETE' })
      // Refresh data to reflect changes
      await fetchAllData()
    } catch (err) {
      console.error('Error deleting city:', err)
    }
  }

  // -----------------------------
  //     DRAG & DROP LOGIC
  // -----------------------------
  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination) return
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return
    }
    const [itemType, itemName] = draggableId.split('::')
    const destDroppable = destination.droppableId

    if (destDroppable.startsWith('city-')) {
      const cityName = destDroppable.replace('city-', '')
      try {
        await request(`/api/cities/assignments/${cityName}`, {
          method: 'PUT',
          body: JSON.stringify({ type: itemType, name: itemName }),
        })
        await fetchAllData()
        setRefreshTrigger((prev) => prev + 1)
      } catch (err) {
        console.error('Error assigning item to city:', err)
      }
    }
  }

  return (
    <div className="container-fluid" style={{ padding: '20px' }}>
      <Typography variant="h6" align="center" className="mb-4">
        Drag & drop personnel & vehicles:
      </Typography>

      <DragDropContext onDragEnd={onDragEnd}>
        <Box className="row">
          {/* LEFT SIDE: PERSONNEL, CARS, TRUCKS */}
          <div className="col-12 col-md-4 mb-3">
            <Card className="shadow-sm">
              <CardContent>
                {/* PERSONNEL */}
                <Typography variant="h6" className="mb-2">
                  Personnel
                </Typography>
                <Droppable droppableId="personnel">
                  {(provided) => (
                    <List
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{
                        minHeight: '50px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                      }}
                    >
                      {sortedPersonnel.map((person, index) => {
                        const draggableId = `Personnel::${person.name}`
                        return (
                          <Draggable
                            key={draggableId}
                            draggableId={draggableId}
                            index={index}
                          >
                            {(providedDrag) => (
                              <ListItem
                                ref={providedDrag.innerRef}
                                {...providedDrag.draggableProps}
                                {...providedDrag.dragHandleProps}
                                sx={{ touchAction: 'none' }}
                              >
                                <ListItemText primary={person.name} />
                              </ListItem>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>

                {/* CARS */}
                <Typography variant="h6" style={{ marginTop: 16 }}>
                  Cars
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <TextField
                    size="small"
                    value={newCar}
                    onChange={(e) => setNewCar(e.target.value)}
                    placeholder="New Car"
                  />
                  <IconButton onClick={addCar}>
                    <Add />
                  </IconButton>
                </Box>
                <Droppable droppableId="cars">
                  {(provided) => (
                    <List
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{ minHeight: '50px' }}
                    >
                      {sortedCars.map((car, index) => {
                        const draggableId = `Car::${car.name}`
                        return (
                          <Draggable
                            key={draggableId}
                            draggableId={draggableId}
                            index={index}
                          >
                            {(providedDrag) => (
                              <ListItem
                                ref={providedDrag.innerRef}
                                {...providedDrag.draggableProps}
                                {...providedDrag.dragHandleProps}
                                sx={{ touchAction: 'none' }}
                                secondaryAction={
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => removeCar(car._id)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                }
                              >
                                <ListItemText
                                  primary={car.name}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                  }}
                                />
                              </ListItem>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>

                {/* TRUCKS */}
                <Typography variant="h6" style={{ marginTop: 16 }}>
                  Trucks
                </Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <TextField
                    size="small"
                    value={newTruck}
                    onChange={(e) => setNewTruck(e.target.value)}
                    placeholder="New Truck"
                  />
                  <IconButton onClick={addTruck}>
                    <Add />
                  </IconButton>
                </Box>
                <Droppable droppableId="trucks">
                  {(provided) => (
                    <List
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      style={{ minHeight: '50px' }}
                    >
                      {sortedTrucks.map((truck, index) => {
                        const draggableId = `Truck::${truck.name}`
                        return (
                          <Draggable
                            key={draggableId}
                            draggableId={draggableId}
                            index={index}
                          >
                            {(providedDrag) => (
                              <ListItem
                                ref={providedDrag.innerRef}
                                {...providedDrag.draggableProps}
                                {...providedDrag.dragHandleProps}
                                sx={{ touchAction: 'none' }}
                                secondaryAction={
                                  <IconButton
                                    edge="end"
                                    size="small"
                                    onClick={() => removeTruck(truck._id)}
                                  >
                                    <Delete fontSize="small" />
                                  </IconButton>
                                }
                              >
                                <ListItemText
                                  primary={truck.name}
                                  primaryTypographyProps={{
                                    variant: 'body2',
                                  }}
                                />
                              </ListItem>
                            )}
                          </Draggable>
                        )
                      })}
                      {provided.placeholder}
                    </List>
                  )}
                </Droppable>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE: CITIES */}
          <div className="col-12 col-md-8 mb-3">
            <Card className="shadow-sm">
              <CardContent>
                <Typography variant="h6">Cities</Typography>
                <Box display="flex" alignItems="center" mb={1}>
                  <TextField
                    size="small"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="New City"
                  />
                  <IconButton onClick={addCity}>
                    <Add />
                  </IconButton>
                </Box>

                <List>
                  {sortedCities.map((city) => (
                    <Droppable key={city._id} droppableId={`city-${city.name}`}>
                      {(provided) => (
                        <ListItem
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="mb-2 border rounded"
                        >
                          <Box
                            sx={{
                              display: 'flex',
                              flexDirection: 'column',
                              width: '100%',
                              padding: '8px',
                            }}
                          >
                            {/* City name + delete button */}
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                              }}
                              className="mb-2"
                            >
                              <ListItemText
                                primary={
                                  <span className="fw-bold">{city.name}</span>
                                }
                              />
                              <IconButton
                                edge="end"
                                onClick={() => removeCity(city._id)}
                                aria-label="Remove city"
                              >
                                <Delete />
                              </IconButton>
                            </Box>

                            {/* CityContainer displays assigned cars/trucks/personnel */}
                            <Box>
                              <CityContainer
                                cityName={city.name}
                                refreshTrigger={refreshTrigger}
                              />
                            </Box>
                          </Box>
                          {provided.placeholder}
                        </ListItem>
                      )}
                    </Droppable>
                  ))}
                </List>
              </CardContent>
            </Card>
          </div>
        </Box>
      </DragDropContext>
    </div>
  )
}

export default Organization
