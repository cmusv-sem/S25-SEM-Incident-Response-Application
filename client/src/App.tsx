import { StyledEngineProvider } from '@mui/material/styles'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import ChatRoomPage from './pages/ChatRoomPage'
import Contacts from './pages/Contacts'
import GroupInformationPage from './pages/GroupInformationPage'
import GroupsPage from './pages/GroupsPage'
import HomePage from './pages/HomePage'
import IncidentsPage from './pages/IncidentsPage'
import LoginPage from './pages/LoginPage'
import MapPage from './pages/MapPage'
import Messages from './pages/Messages'
import Organization from './pages/Organization'
import ProfilePage from './pages/ProfilePage'
import Reach911Page from './pages/Reach911Page'
import RegisterPage from './pages/RegisterPage'
import ViewOrganization from './pages/ViewOrganization'
import RoutedHome from './routing/RoutedHome'

export default function App() {
  //const dispatcher = useDispatch()

  // This is an example to display a snackbar
  // useEffect(() => {
  //   setTimeout(() => {
  //     dispatcher(
  //       setSnackbar({
  //         type: SnackbarType.INFO,
  //         message: 'Hello there!',
  //         durationMs: 1000,
  //       }),
  //     )
  //   }, 3000)
  // })

  return (
    <StyledEngineProvider injectFirst>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<RoutedHome showBackButton />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/reach911" element={<Reach911Page />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/incidents" element={<IncidentsPage />} />
            <Route path="/organization" element={<Organization />} />
            <Route path="/organization/view" element={<ViewOrganization />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
          <Route element={<RoutedHome showBackButton isSubPage />}>
            <Route path="/messages/:id" element={<ChatRoomPage />} />
            <Route path="/groups/:id" element={<GroupInformationPage />} />
          </Route>
        </Routes>
      </Router>
    </StyledEngineProvider>
  )
}
