import {
  NavigateNext as Arrow,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { Box, IconButton, List, ListItemText, Typography } from "@mui/material";
import { Fragment, FunctionComponent } from "react";
import IUser from "../models/User";
import Loading from "./common/Loading";
import { getRoleIcon } from "./common/RoleIcon";

export type ClickContactHandler = (id: string, username: string) => void;

export interface IContactProps {
  user: IUser;
  onClick?: ClickContactHandler;
}

export const Contact: FunctionComponent<IContactProps> = ({
  user: { _id, username, online, role },
  onClick,
}) => {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 15px",
        border: "1.5px solid #ddd",
        borderRadius: "8px",
        backgroundColor: "#fff",
        marginBottom: "8px",
        width: "90%",
        mx: "auto",
        cursor: "pointer",
        "&:hover": { backgroundColor: "#f0f0f0" },
      }}
      onClick={() => onClick && onClick(_id, username)}
    >
      {getRoleIcon(role)}
      <ListItemText sx={{ flex: 1 }}>{username}</ListItemText>
      <Box>
        {online ? (
          <Visibility color="success" />
        ) : (
          <VisibilityOff color="disabled" />
        )}
      </Box>
      {onClick && (
        <IconButton
          edge="end"
          size="large"
          onClick={(e) => {
            e.stopPropagation();
            onClick(_id, username);
          }}
        >
          <Arrow />
        </IconButton>
      )}
    </Box>
  );
};

export interface IContactListProps {
  /**\
   * List of users that the current user is allowed to see
   */
  users?: IUser[];
  /**
   * Optional click handler for when a user is clicked
   */
  onClick?: ClickContactHandler;
  /**
   * Whether the users are still loading
   */
  loading: boolean;
}

export const ContactList: FunctionComponent<IContactListProps> = ({
  users,
  onClick,
  loading,
}) => {
  if (loading) return <Loading />;

  if (users && users.length === 0) {
    return <Typography style={{ padding: 16 }}>No contacts</Typography>;
  }

  return (
    <List sx={{ width: "100%", maxWidth: 320, mx: "auto", padding: 0 }}>
      {users &&
        users.map((user) => (
          <Fragment key={user._id}>
            <Contact user={user} onClick={onClick} />
          </Fragment>
        ))}
    </List>
  );
};
export default ContactList;
