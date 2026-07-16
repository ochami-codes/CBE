import { getAttendanceRegister} from "./getAttendanceRegister.js";
import { getLastAttendance} from "./getLastAttendance.js";
export async function getAttendance(options) {
  const [
    register,
    lastSabbath,
  ] = await Promise.all([
    getAttendanceRegister(options),
    getLastAttendance(options),
  ]);

  return {
    register,
    lastSabbath,
  };
}