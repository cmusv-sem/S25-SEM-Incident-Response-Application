import { NavigateNext as Arrow } from "@mui/icons-material";
import {
  Avatar,
  Box,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import type { ITask } from "../../../../server/src/models/SarTask";
import request from "../../utils/request";

const getTaskImage = (status: string) => {
  return status === "IN-PROGRESS"
    ? "/src/SarTaskProgress.jpeg"
    : "/src/SarTaskTodo.png";
};
interface TaskStatsProps {
  incidentId: string;
}
const TaskDirectory: React.FC<TaskStatsProps> = ({ incidentId }) => {
  const [tasks, setTasks] = useState<ITask[]>([]);

  const fetchNotDoneTasks = async () => {
    try {
      const allTasks = await request(`/api/sartasks/notdone`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ incidentId }),
      }).catch(() => []);

      const sortedTasks = allTasks.sort((a: ITask, b: ITask) =>
        a.address.localeCompare(b.address),
      );
      setTasks(sortedTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    }
  };

  useEffect(() => {
    fetchNotDoneTasks();
  }, []);

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", mt: 4, p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2, textAlign: "center" }}>
        Tasks TO-DO and IN-PROGRESS
      </Typography>
      {tasks.length > 0 ? (
        <List>
          {tasks.map((task) => (
            <ListItem
              key={task._id}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center", // Ensures vertical alignment
                borderBottom: "1px solid #ddd",
                padding: "10px",
                border: "1.5px solid #ddd",
                borderRadius: "8px",
                "&:hover": { backgroundColor: "#f5f5f5" },
              }}
            >
              {/* Left side: Image and text */}
              <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                <ListItemAvatar>
                  <Avatar
                    src={getTaskImage(task.status)}
                    alt={task.address}
                    sx={{ width: 50, height: 50, mr: 2 }}
                  />
                </ListItemAvatar>
                <ListItemText primary={task.address} />
              </Box>

              {/* Right side: Arrow */}
              <IconButton edge="end" size="large">
                <Arrow />
              </IconButton>
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography sx={{ textAlign: "center", color: "gray" }}>
          No tasks available.
        </Typography>
      )}
    </Box>
  );
};

export default TaskDirectory;
