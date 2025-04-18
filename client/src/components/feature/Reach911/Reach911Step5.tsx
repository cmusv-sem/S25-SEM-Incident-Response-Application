import { getRoleIcon } from "@/components/common/RoleIcon";
import ROLES from "@/utils/Roles";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import type IIncident from "../../../models/Incident";
import { IncidentPriority } from "../../../models/Incident";
import { updateIncident } from "../../../redux/incidentSlice";
import type { AppDispatch } from "../../../redux/store";
import request from "../../../utils/request";
import ConfirmationDialog from "../../common/ConfirmationDialog";

interface Reach911Step5Props {
  incidentId?: string;
}

const Reach911Step5: React.FC<Reach911Step5Props> = ({ incidentId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [incidentData, setIncidentData] = useState<IIncident | null>(null);
  const [priority, setPriority] = useState<string>("E");
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const isClosed = incidentData?.incidentState === "Closed";
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const currentUsername = localStorage.getItem("username") ?? "";
  const [unassignedPersonnel, setUnassignedPersonnel] = useState<string[]>([]);
  const [amICommander, setAmICommander] = useState(false);
  const [currenCommander, setCurrentCommander] = useState<string | null>(
    currentUsername,
  );
  const [showCommanderSelect, setShowCommanderSelect] = useState(false);
  const [newCommander, setNewCommander] = useState<string | null>(null);
  // SEM-2591
  const [canCloseIncident, setCanCloseIncident] =  useState(false);

  // Two-way mapping between UI and backend values for priority.
  const displayToBackend: Record<string, IncidentPriority> = {
    E: IncidentPriority.Immediate,
    "1": IncidentPriority.Urgent,
    "2": IncidentPriority.CouldWait,
    "3": IncidentPriority.Dismiss,
  };

  const backendToDisplay: Record<IncidentPriority, string> = {
    [IncidentPriority.Immediate]: "E",
    [IncidentPriority.Urgent]: "1",
    [IncidentPriority.CouldWait]: "2",
    [IncidentPriority.Dismiss]: "3",
    [IncidentPriority.Unset]: "E",
  };

  // Fetch all personnel and exclude assigned personnel
  useEffect(() => {
    if (!unassignedPersonnel) return;

    const fetchPersonnel = async () => {
      if (incidentData?.commander === currentUsername) {
        setAmICommander(true);
        setCurrentCommander("You");
      } else {
        setCurrentCommander(incidentData?.commander ?? "You");
      }

      try {
        let personnelData = await request("/api/users", {
          method: "GET",
        });

        personnelData = personnelData.filter(
          (person: any) =>
            person.role === ROLES.FIRE || person.role === ROLES.POLICE,
        );

        console.log("Personnel data:", personnelData);

        const assignedPersonnel = await request(`/api/incidents`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        // Assigned personnel are commanders
        const assignedPersonnelSet = new Set<string>();
        assignedPersonnel.forEach((incident: IIncident) => {
          if (incident.commander && incident.incidentState !== "Closed") {
            assignedPersonnelSet.add(incident.commander);
          }
        });
        const allPersonnelSet = new Set<string>();
        personnelData.forEach((person: any) => {
          allPersonnelSet.add(person.username);
        });

        // Filter out assigned personnel from the personnel data
        const assignedPersonnelArray = Array.from(assignedPersonnelSet);
        const unassignedPersonnelSet = new Set<string>(
          Array.from(allPersonnelSet).filter(
            (name) => !assignedPersonnelArray.includes(name),
          ),
        );
        // Convert the Set back to an array
        const unassignedPersonnelNamesArray = Array.from(
          unassignedPersonnelSet,
        );

        const unassignedPersonnel = personnelData.filter((person: any) =>
          unassignedPersonnelNamesArray.includes(person.username),
        );
        setUnassignedPersonnel(unassignedPersonnel);
      } catch (err) {
        console.error("Error fetching unassigned personnel:", err);
      }
    };
    fetchPersonnel();
  }, [incidentData]);

  useEffect(() => {
    const fetchPatients = async () => {
      const patients = await request(`/api/patients/${incidentId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const canClose = amICommander && patients.length === 0;
      setCanCloseIncident(canClose);
    };
    fetchPatients();
  },[amICommander, incidentId]);


  // Fetch incident details and update Redux state
  useEffect(() => {
    const fetchIncidentDetails = async () => {
      try {
        if (!incidentId) throw new Error("No incidentId provided");
        const data = await request(`/api/incidents?incidentId=${incidentId}`);
        if (Array.isArray(data) && data.length > 0) {
          const incident = data[0];
          setIncidentData(incident);
          dispatch(updateIncident(incident));
          if (incident.priority) {
            const uiPriority =
              backendToDisplay[incident.priority as IncidentPriority] || "E";
            setPriority(uiPriority);
          }
          if (incident.commander === currentUsername) {
            setAmICommander(true);
          }
        } else {
          setError("No incident found for this incidentId");
        }
      } catch (err: any) {
        console.error("Error fetching incident details:", err);
        setError("Failed to load incident details");
      } finally {
        setLoading(false);
      }
    };
    fetchIncidentDetails();
  }, [incidentId, dispatch]);

  // Function to handle priority change and save immediately
  const handlePriorityChange = async (newPriority: string) => {
    setPriority(newPriority); // Update UI state immediately
    if (!incidentData) return;
    try {
      setLoading(true);
      setError(null);
      const convertedPriority =
        displayToBackend[newPriority] || IncidentPriority.Immediate;
      const updatedIncident = {
        incidentId: incidentData.incidentId,
        priority: convertedPriority,
        commander: incidentData.commander,
      };

      let updateResponse;
      try {
        updateResponse = await request("/api/incidents/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedIncident),
        });
      } catch (e: any) {
        if (e.message && e.message.includes("Unexpected end of JSON input")) {
          updateResponse = { status: 204 };
        } else {
          throw e;
        }
      }

      if (updateResponse.status !== 204) {
        throw new Error("Failed to update incident");
      }

      dispatch(
        updateIncident({
          ...incidentData,
          priority: convertedPriority,
          commander: incidentData.commander,
        }),
      );
    } catch (err) {
      console.error("Error updating incident:", err);
      setError("Failed to update incident");
    } finally {
      setLoading(false);
    }
  };

  // Navigation handler to resources page
  const handleNavigateToResources = () => {
    navigate(`/resources`);
  };

  const handleCloseIncidentClick = () => {
    setShowCloseConfirm(true);
  };

  const handleCancelCloseIncident = () => {
    setShowCommanderSelect(false);
    setShowCloseConfirm(false);
  };

  const handleConfirmCloseIncident = async () => {
    setShowCloseConfirm(false);

    if (!incidentData?.incidentId) {
      setError("No incident ID found to close");
      return;
    }
    try {
      setLoading(true);

      const closedIncident = await request<IIncident>(
        `/api/incidents/${incidentData.incidentId}`,
        {
          method: "DELETE",
        },
      );
      dispatch(updateIncident(closedIncident));
      setIncidentData(closedIncident);
      console.log("Incident closed successfully");
    } catch (err: any) {
      console.error("Error closing incident:", err);
      setError(err.message ?? "Unknown error while closing incident");
    } finally {
      setLoading(false);
    }
  };

  const handleCommanderChange = async (newCommander: string) => {
    setNewCommander(newCommander);
    setShowCommanderSelect(true);
  };

  const handleCancelTransferCommand = () => {
    setShowCommanderSelect(false);
  };

  const handleConfirmCommanderSelect = async () => {
    setShowCommanderSelect(false);
    if (!incidentData) return;

    if (newCommander === "You") {
      setNewCommander(currentUsername);
      setAmICommander(true);
      if (incidentData?.commander === currentUsername) {
        return;
      }
    } else {
      setAmICommander(false);
    }

    const incidentState =
      incidentData.incidentState === "Triage"
        ? "Assigned"
        : incidentData.incidentState;
    try {
      const updatedIncident = {
        ...incidentData,
        incidentState: incidentState,
        commander: newCommander,
      };
      let updateResponse;
      try {
        updateResponse = await request("/api/incidents/update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedIncident),
        });
      } catch (e: any) {
        if (e.message && e.message.includes("Unexpected end of JSON input")) {
          updateResponse = { status: 204 };
        } else {
          throw e;
        }
      }

      if (incidentData.incidentCallGroup) {
        const channel: IChannel = await request(
          `/api/channels/${incidentData.incidentCallGroup}`,
          {
            method: "GET",
          },
        );
        if (channel) {
          const userIds = new Set(channel.users?.map((user) => user._id));

          const newCommanderUser = unassignedPersonnel.find(
            (person) => person.username === newCommander,
          );
          userIds.add(newCommanderUser._id);
          await request(`/api/channels`, {
            method: "PUT",
            body: JSON.stringify({
              _id: channel?._id,
              users: Array.from(userIds),
            }),
          });
        }
      }

      if (updateResponse.status !== 204) {
        throw new Error("Failed to update incident");
      }

      dispatch(
        updateIncident({
          ...incidentData,
          commander: newCommander,
          incidentState: incidentState,
        }),
      );
      if (newCommander === currentUsername) {
        setAmICommander(true);
        setCurrentCommander("You");
      } else setCurrentCommander(newCommander);
    } catch (err) {
      console.error("Error updating incident:", err);
      setError("Failed to update incident");
    } finally {
      setLoading(false);
    }
  };

  const openRespondersChat = async (
    incidentId: string,
    navigate: (path: string) => void,
    setLoading: (loading: boolean) => void,
    setError: (err: string | null) => void,
  ) => {
    try {
      setLoading(true);
      setError(null);

      const updatedIncident = await request<IIncident>(
        `/api/incidents/${incidentId}/responders-group`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const respondersGroupId = updatedIncident.respondersGroup?._id;
      if (!respondersGroupId) {
        throw new Error("No responders group found on this incident.");
      }

      navigate(`/messages?channelId=${respondersGroupId}`);
    } catch (err: any) {
      console.error("Failed to create or open responders chat group:", err);
      setError(err.message ?? "Error occurred while creating chat group");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper elevation={3} sx={{ p: 2, m: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <CircularProgress />
        </Box>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 2, m: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Paper>
    );
  }

  if (!incidentData) {
    return (
      <Paper elevation={3} sx={{ p: 2, m: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" p={3}>
          <Typography>No incident data available</Typography>
        </Box>
      </Paper>
    );
  }

  const responders = incidentData.assignedVehicles?.flatMap(
    (vehicle) => vehicle.usernames || [],
  );

  const firstResponders = responders
    ?.filter((username) => !username.includes(incidentData.commander))
    .map((username) =>
      username === currentUsername ? `${username}(You) ` : `${username} `,
    );

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  return (
    <Paper elevation={3} sx={{ p: 2, m: 2 }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          Response Team Corner
        </Typography>
        <Typography>
          Incident Open: {formatDate(incidentData.openingDate)}
        </Typography>
        {incidentData.closingDate && (
          <Typography>
            Incident Close: {formatDate(incidentData.closingDate)}
          </Typography>
        )}

        <Typography>Incident ID: {incidentData.incidentId}</Typography>
        <Typography>
          Incident Caller: {incidentData.caller || "None"}
        </Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Incident Priority
        </Typography>
        {isClosed ? (
          <Typography>{priority}</Typography>
        ) : (
          <FormControl fullWidth>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priority}
              label="Priority"
              onChange={(e) => handlePriorityChange(e.target.value as string)}
            >
              <MenuItem value="E">E</MenuItem>
              <MenuItem value="1">1</MenuItem>
              <MenuItem value="2">2</MenuItem>
              <MenuItem value="3">3</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Who is on the Team?
        </Typography>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Owner:{" "}
          {incidentData.owner === currentUsername
            ? `You (${currentUsername})`
            : incidentData.owner}
        </Typography>

        {firstResponders && firstResponders.length >= 1 ? (
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            First Responders: {firstResponders}
          </Typography>
        ) : null}

        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          Incident Commander
        </Typography>
        {isClosed ? (
          <Typography>{incidentData.commander}</Typography>
        ) : (
          <FormControl fullWidth>
            <InputLabel>Commander</InputLabel>
            <Select
              value={currenCommander}
              label="Commander"
              onChange={(e) => handleCommanderChange(e.target.value as string)}
            >
              <MenuItem key={currenCommander} value={currenCommander}>
                {currenCommander}
              </MenuItem>
              {unassignedPersonnel.map((person) => (
                <MenuItem key={person.username} value={person.username}>
                  {getRoleIcon(person.role)}
                  {person.username === currentUsername
                    ? `You`
                    : `${person.username}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {!isClosed && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleNavigateToResources}
          >
            Allocate Resources
          </Button>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={() =>
              incidentId &&
              openRespondersChat(incidentId, navigate, setLoading, setError)
            }
            style={{
              pointerEvents: responders?.includes(currentUsername)
                ? "auto"
                : "none",
            }}
          >
            Chat with Responders
          </Button>

          <Button
            variant="contained"
            color="error"
            fullWidth
            disabled={!canCloseIncident}
            onClick={handleCloseIncidentClick}
          >
            Close Incident
          </Button>
          
          {!canCloseIncident && (
          <Typography className="self-center">
            An Incident can only be closed once all Priority E or 1 Patients are taken care of at the ER.
          </Typography>

        )}
        </Box>
      )}

      {isClosed && (
        <Box
          sx={{
            mt: 3,
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            pointerEvents: "auto",
            position: "relative",
            zIndex: 1001,
          }}
        >
          <Typography variant="h6" color="error">
            Incident is Closed
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="small"
            style={{ zIndex: 1001 }}
            onClick={() => {
              navigate("/incidents/report", {
                state: { incidentData },
              });
            }}
          >
            report
          </Button>
        </Box>
      )}
      <ConfirmationDialog
        open={showCloseConfirm}
        title="Confirm Close"
        description="Are you sure you want to close this incident? This action cannot be undone."
        onConfirm={handleConfirmCloseIncident}
        onCancel={handleCancelCloseIncident}
        confirmText="Yes"
        cancelText="No"
      />
      <ConfirmationDialog
        open={showCommanderSelect}
        title="Alert"
        description={`Are you sure you want to transfer command to ${newCommander}?`}
        onConfirm={handleConfirmCommanderSelect}
        onCancel={handleCancelCloseIncident}
        confirmText="Yes"
        cancelText="No"
      />
    </Paper>
  );
};

export default Reach911Step5;
