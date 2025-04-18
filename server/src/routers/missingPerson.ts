import { Router } from "express";
import MissingPersonController from "../controllers/MissingPersonController";
import type { IMissingPerson } from "../models/MissingPerson";

export default Router()
  .post("/register", async (request, response) => {
    try {
      const missingPersonData = request.body as Partial<IMissingPerson>;
      if (!isValidMissingPersonData(missingPersonData)) {
        return response.status(400).send({
          message:
            "name, age, race, gender, and dateLastSeen are mandatory fields.",
        });
      }
      const result = await MissingPersonController.create(missingPersonData);
      // TO DO: send a socket event here
      return response.status(201).send(result);
    } catch (e) {
      const error = e as Error;
      return response.status(500).send({ message: error.message });
    }
  })

  .get("/report", async (request, response) => {
    try {
      const { id } = request.query;
      if (id) {
        const result = await MissingPersonController.getMissingPersonById(
          id as string,
        );
        if (!result) {
          return response.status(404).send({
            message: "Missing person report not found.",
          });
        }
        return response.status(200).send(result);
      } else {
        const result = await MissingPersonController.getAllMissingPersons();
        return response.status(200).send(result);
      }
    } catch (e) {
      const error = e as Error;
      return response.status(500).send({ message: error.message });
    }
  });

/**
 * Validate missing person register request.
 *
 * @param data Partial missing person data from the request.
 * @returns true if all mandatory fields are present, otherwise false.
 */
function isValidMissingPersonData(data: Partial<IMissingPerson>): boolean {
  return !!(
    data.name &&
    data.age != null &&
    data.race &&
    data.gender &&
    data.dateLastSeen
  );
}
