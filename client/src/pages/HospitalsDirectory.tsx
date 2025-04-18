import GenericItemizeContainer from "@/components/GenericItemizeContainer";
import IHospital from "@/models/Hospital";
import request from "@/utils/request";
import { Add, NavigateNext as Arrow } from "@mui/icons-material";
import { Box, IconButton } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import SocketClient from "../utils/Socket";

const HospitalsDirectory: React.FC = () => {
  const [hospitalList, setHospitalList] = useState<IHospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchHospitals = async (): Promise<void> => {
    setError(null);
    try {
      const data = await request("/api/hospital");
      setHospitalList(
        data.sort((a: IHospital, b: IHospital) =>
          a.hospitalName.localeCompare(b.hospitalName),
        ),
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch hospitals";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  useEffect(() => {
    const socket = SocketClient.connect();
    const handleHospitalUpdate = (): void => {
      fetchHospitals();
    };

    socket?.on("registerHospital", handleHospitalUpdate);
    socket?.on("deleteHospital", handleHospitalUpdate);

    return () => {
      socket?.off("registerHospital", handleHospitalUpdate);
      socket?.off("deleteHospital", handleHospitalUpdate);
    };
  }, []);

  // Handle redirection to the register hospital page
  const redirectToRegisterHospital = () => {
    navigate("/register-hospital");
  };

  // Handle redirection to the register hospital page to access description
  const redirectToHospitalDescription = (hospital: IHospital) => {
    navigate(`/register-hospital/${hospital.hospitalId}`);
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Box sx={{ padding: 2 }}>
      <GenericItemizeContainer<IHospital>
        items={hospitalList}
        getKey={(hospital: IHospital): string => hospital.hospitalId}
        showHeader={true}
        emptyMessage="No hospitals available"
        columns={[
          {
            key: "hospitalName",
            align: "center",
            label: "Name",
            render: (hospital: IHospital): string => hospital.hospitalName,
          },
          {
            key: "totalNumberERBeds",
            align: "center",
            label: "Total ER Beds",
            render: (hospital: IHospital): number => hospital.totalNumberERBeds,
          },
          {
            // available beds
            key: "totalNumberOfPatients",
            align: "center",
            label: "Available ER Beds",
            render: (hospital: IHospital): number =>
              hospital.totalNumberERBeds - hospital.totalNumberOfPatients,
          },
          {
            key: "hospitalId",
            align: "center",
            label: "",
            render: (hospital) => (
              <IconButton
                edge="end"
                size="large"
                onClick={() => redirectToHospitalDescription(hospital)}
              >
                <Arrow />
              </IconButton>
            ),
          },
        ]}
      />
      <IconButton
        sx={{
          position: "fixed",
          bottom: 30,
          right: 10,
          width: 56,
          height: 56,
        }}
        onClick={redirectToRegisterHospital}
      >
        <Add fontSize="large" />
      </IconButton>
    </Box>
  );
};

export default HospitalsDirectory;
